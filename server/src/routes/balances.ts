/**
 * GET /api/balances?wallet=<address>
 *
 * Returns native COOK and SPL token balances for a wallet by querying
 * the Cookie Chain RPC directly via @solana/web3.js and @solana/spl-token.
 * No external subprocess or MCP dependency.
 *
 * Response shape (unchanged from previous cookie-mcp implementation):
 *   { wallet: string, balances: NormalisedBalance[] }
 *
 * Each NormalisedBalance:
 *   { mint, symbol, name, uiAmount, rawAmount, decimals, usdValue }
 *
 * usdValue is null — price data is not available from the RPC.
 * The frontend already handles null gracefully (hides the ≈$ line).
 */

import type { Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getConnection } from "../rpcClient.js";

// ── Known token metadata ──────────────────────────────────────────────────────
// These are the only mints the app currently shows. Matches KNOWN_TOKENS in
// SwapPanel.tsx and the MINT_SYMBOLS map in activity.ts.

const COOK_MINT = "So11111111111111111111111111111111111111112";
const COOK_DECIMALS = 9;

interface MintMeta {
  symbol: string;
  name: string;
}

const KNOWN_MINTS: Record<string, MintMeta> = {
  [COOK_MINT]: { symbol: "COOK", name: "Cookie (native)" },
  "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": { symbol: "bCOOK", name: "bakedCOOK" },
  "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": { symbol: "CHAT", name: "Cookie Chat" },
};

// ── Output shape (identical to previous implementation) ───────────────────────

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
    const balances: NormalisedBalance[] = [];

    // ── Native COOK balance ───────────────────────────────────────────────────
    const lamports = await conn.getBalance(pubkey, "confirmed");
    const cookUi = lamports / 10 ** COOK_DECIMALS;
    balances.push({
      mint: COOK_MINT,
      symbol: "COOK",
      name: "Cookie (native)",
      uiAmount: cookUi,
      rawAmount: String(lamports),
      decimals: COOK_DECIMALS,
      usdValue: null,
    });

    // ── SPL token balances ────────────────────────────────────────────────────
    // getParsedTokenAccountsByOwner returns all SPL accounts with fully parsed
    // token data (mint, decimals, uiAmount, raw amount string) in one call.
    const { value: tokenAccounts } = await conn.getParsedTokenAccountsByOwner(
      pubkey,
      { programId: TOKEN_PROGRAM_ID },
      "confirmed",
    );

    for (const { account } of tokenAccounts) {
      const parsed = account.data.parsed as {
        info: {
          mint: string;
          tokenAmount: {
            uiAmount: number | null;
            amount: string;       // raw integer string
            decimals: number;
          };
        };
      };

      const mint = parsed.info.mint;
      const tokenAmount = parsed.info.tokenAmount;

      // Only include mints the app knows about; skip dust/unknown tokens.
      const meta = KNOWN_MINTS[mint];
      if (!meta) continue;

      balances.push({
        mint,
        symbol: meta.symbol,
        name: meta.name,
        uiAmount: tokenAmount.uiAmount,
        rawAmount: tokenAmount.amount,
        decimals: tokenAmount.decimals,
        usdValue: null,
      });
    }

    res.json({ wallet, balances });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[balances]", message);
    res.status(502).json({ error: "Failed to fetch balances", hint: message });
  }
}
