/**
 * GET /api/balances?wallet=<address>
 *
 * Returns native COOK and SPL token balances with real USD prices from the
 * Candy Shop token list (swap.cookiescan.io/api/tokens).
 *
 * Response shape (unchanged from previous implementation):
 *   { wallet: string, balances: NormalisedBalance[] }
 *
 * Each NormalisedBalance:
 *   { mint, symbol, name, uiAmount, rawAmount, decimals, usdValue }
 *
 * Price notes:
 *   - bCOOK and CHAT prices come directly from Candy Shop's priceUsd field.
 *   - COOK (native) price is derived: bCOOK.priceUsd / bCOOK.priceNative.
 *     priceNative is COOK-per-bCOOK from Candy Shop (confirmed: 1 bCOOK quote
 *     returns ~1.318 COOK, matching the field). Division gives COOK in USD.
 *   - Prices are fetched fresh per request from Candy Shop. The endpoint is
 *     fast (<300ms) and returns live trade data.
 *
 * Duplicate-mint guard:
 *   COOK's mint (So111...112) can appear as both a native balance AND an SPL
 *   token account (rent-exempt empty account). The SPL entry is always dropped
 *   in favour of the authoritative native getBalance() result.
 */

import type { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getConnection } from "../rpcClient.js";

// ── Known token metadata ──────────────────────────────────────────────────────

const COOK_MINT = "So11111111111111111111111111111111111111112";
const bCOOK_MINT = "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz";
const COOK_DECIMALS = 9;

interface MintMeta { symbol: string; name: string; }

const KNOWN_MINTS: Record<string, MintMeta> = {
  [COOK_MINT]: { symbol: "COOK", name: "Cookie (native)" },
  [bCOOK_MINT]: { symbol: "bCOOK", name: "bakedCOOK" },
  "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": { symbol: "CHAT", name: "Cookie Chat" },
};

// ── Candy Shop price feed ─────────────────────────────────────────────────────

const CANDY_TOKENS_URL = "https://swap.cookiescan.io/api/tokens";

interface CandyToken {
  mint: string;
  symbol: string;
  priceUsd: number;
  priceNative: number; // COOK per this token
}

/**
 * Fetch live USD prices for all known mints from Candy Shop.
 * Returns a map of mint → usdValue. Falls back to null on any error so
 * balance data is always returned even if the price call fails.
 *
 * COOK price derivation: Candy Shop lists all tokens quoted in COOK.
 * priceNative = COOK per token. So COOK_USD = token.priceUsd / token.priceNative.
 * We use bCOOK as the reference (most liquid, most stable ratio to COOK).
 */
async function fetchPrices(): Promise<Record<string, number | null>> {
  try {
    const res = await fetch(CANDY_TOKENS_URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return {};

    const tokens = (await res.json()) as CandyToken[];
    const prices: Record<string, number | null> = {};

    // Derive COOK USD from bCOOK (most liquid reference)
    const bCookEntry = tokens.find(t => t.mint === bCOOK_MINT);
    if (bCookEntry && bCookEntry.priceNative > 0) {
      prices[COOK_MINT] = bCookEntry.priceUsd / bCookEntry.priceNative;
    }

    // Direct priceUsd for all other known mints
    for (const tok of tokens) {
      if (KNOWN_MINTS[tok.mint] && tok.mint !== COOK_MINT) {
        prices[tok.mint] = typeof tok.priceUsd === "number" ? tok.priceUsd : null;
      }
    }

    return prices;
  } catch {
    return {};
  }
}

// ── Output shape ──────────────────────────────────────────────────────────────

interface NormalisedBalance {
  mint: string;
  symbol: string;
  name: string;
  uiAmount: number | null;
  rawAmount: string;
  decimals: number;
  usdValue: number | null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function getBalances(req: Request, res: Response): Promise<void> {
  const wallet = (req.query["wallet"] as string | undefined)?.trim();

  if (!wallet) {
    res.status(400).json({ error: "Missing ?wallet= query parameter" });
    return;
  }
  if (!BASE58.test(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(wallet);
  } catch {
    res.status(400).json({ error: "Invalid public key" });
    return;
  }

  try {
    const conn = getConnection();

    // Fetch RPC balances and Candy Shop prices in parallel
    const [lamports, splResult, prices] = await Promise.all([
      conn.getBalance(pubkey, "confirmed"),
      conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_PROGRAM_ID }, "confirmed"),
      fetchPrices(),
    ]);

    // ── Build balances list ───────────────────────────────────────────────────
    // Use a Map keyed by mint so duplicate mints are naturally deduplicated.
    // Native COOK is inserted first; any SPL account for the same mint is skipped.
    const byMint = new Map<string, NormalisedBalance>();

    // Native COOK
    const cookUi = lamports / 10 ** COOK_DECIMALS;
    const cookUsd = prices[COOK_MINT] ?? null;
    byMint.set(COOK_MINT, {
      mint: COOK_MINT,
      symbol: "COOK",
      name: "Cookie (native)",
      uiAmount: cookUi,
      rawAmount: String(lamports),
      decimals: COOK_DECIMALS,
      usdValue: cookUsd !== null ? cookUi * cookUsd : null,
    });

    // SPL tokens — skip COOK_MINT (native is authoritative), skip unknown mints
    for (const { account } of splResult.value) {
      const parsed = account.data.parsed as {
        info: {
          mint: string;
          tokenAmount: { uiAmount: number | null; amount: string; decimals: number; };
        };
      };

      const mint = parsed.info.mint;
      if (mint === COOK_MINT) continue;       // dedupe: native is authoritative

      const meta = KNOWN_MINTS[mint];
      if (!meta) continue;                    // skip unknown/dust tokens

      if (byMint.has(mint)) continue;         // dedupe: first entry wins

      const { uiAmount, amount, decimals } = parsed.info.tokenAmount;
      const unitPrice = prices[mint] ?? null;
      const usdValue = unitPrice !== null && uiAmount !== null ? uiAmount * unitPrice : null;

      byMint.set(mint, {
        mint,
        symbol: meta.symbol,
        name: meta.name,
        uiAmount,
        rawAmount: amount,
        decimals,
        usdValue,
      });
    }

    res.json({ wallet, balances: [...byMint.values()] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[balances]", message);
    res.status(502).json({ error: "Failed to fetch balances", hint: message });
  }
}
