/**
 * GET /api/activity?wallet=<address>&limit=<n>
 *
 * Returns the wallet's recent transaction history from Cookie Chain.
 */

import type { Request, Response } from "express";
import {
  Connection,
  PublicKey,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  type ConfirmedSignatureInfo,
  type ParsedTransactionWithMeta,
} from "@solana/web3.js";

// ── Connection singleton ──────────────────────────────────────────────────────

let _connection: Connection | null = null;

function getConnection(): Connection {
  if (_connection) return _connection;
  const url = process.env["COOKIE_RPC_URL"] ?? "https://rpc.cookiescan.io";
  _connection = new Connection(url, "confirmed");
  return _connection;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityItem {
  signature: string;
  blockTime: number | null;
  status: "confirmed" | "failed";
  description: string;
  /** Best-effort amount string, e.g. "10 COOK → 7.57 bCOOK" or "3,530 COOK" */
  amount: string | null;
  slot: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────


/**
 * Extract a human-readable amount string from pre/post token balances.
 * For the wallet owner: find mints whose balance changed, then build
 * "X TOKEN" or "X A → Y B" string.
 *
 * Returns null if no meaningful delta is found.
 */
function extractAmount(
  tx: ParsedTransactionWithMeta | null,
  walletAddress: string
): string | null {
  if (!tx?.meta) return null;

  const pre = tx.meta.preTokenBalances ?? [];
  const post = tx.meta.postTokenBalances ?? [];

  // Map mint → { pre, post, decimals, symbol }
  const byMint = new Map<string, { pre: number; post: number; decimals: number; symbol?: string }>();

  for (const b of pre) {
    if (b.owner !== walletAddress) continue;
    byMint.set(b.mint, {
      pre: b.uiTokenAmount.uiAmount ?? 0,
      post: 0,
      decimals: b.uiTokenAmount.decimals,
      symbol: (b as { uiTokenAmount: { uiAmountString?: string }; mint: string; owner?: string }).uiTokenAmount.uiAmountString !== undefined ? undefined : undefined,
    });
  }
  for (const b of post) {
    if (b.owner !== walletAddress) continue;
    const existing = byMint.get(b.mint);
    if (existing) {
      existing.post = b.uiTokenAmount.uiAmount ?? 0;
    } else {
      byMint.set(b.mint, {
        pre: 0,
        post: b.uiTokenAmount.uiAmount ?? 0,
        decimals: b.uiTokenAmount.decimals,
      });
    }
  }

  // Also check native COOK (lamport) delta
  const preLamports = tx.meta.preBalances?.[0] ?? null;
  const postLamports = tx.meta.postBalances?.[0] ?? null;
  const fee = tx.meta.fee ?? 0;
  const cookDelta =
    preLamports != null && postLamports != null
      ? postLamports - preLamports + fee  // add fee back to see true send/receive
      : null;

  // Build delta list
  const deltas: { mint: string; delta: number; decimals: number }[] = [];
  for (const [mint, bal] of byMint.entries()) {
    const delta = bal.post - bal.pre;
    if (Math.abs(delta) > 0.000001) {
      deltas.push({ mint, delta, decimals: bal.decimals });
    }
  }

  // Known mint → symbol map (same tokens we show in the app)
  const MINT_SYMBOLS: Record<string, string> = {
    "So11111111111111111111111111111111111111112": "COOK",
    "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": "bCOOK",
    "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": "CHAT",
  };

  function mintLabel(mint: string, _decimals: number, delta: number): string {
    const sym = MINT_SYMBOLS[mint] ?? mint.slice(0, 4) + "…";
    const amt = Math.abs(delta).toLocaleString("en-US", { maximumFractionDigits: 4 });
    return `${amt} ${sym}`;
  }

  // Swap: one negative delta (spent) + one positive delta (received)
  const spent = deltas.filter((d) => d.delta < 0);
  const received = deltas.filter((d) => d.delta > 0);

  if (spent.length === 1 && received.length === 1) {
    return `${mintLabel(spent[0].mint, spent[0].decimals, spent[0].delta)} → ${mintLabel(received[0].mint, received[0].decimals, received[0].delta)}`;
  }

  // Single positive (received)
  if (received.length === 1 && spent.length === 0) {
    return mintLabel(received[0].mint, received[0].decimals, received[0].delta);
  }

  // Single negative (sent token)
  if (spent.length === 1 && received.length === 0) {
    return mintLabel(spent[0].mint, spent[0].decimals, spent[0].delta);
  }

  // Multi-delta (liquidity / complex): show largest absolute change
  if (deltas.length > 0) {
    const biggest = deltas.reduce((a, b) =>
      Math.abs(a.delta) > Math.abs(b.delta) ? a : b
    );
    return mintLabel(biggest.mint, biggest.decimals, biggest.delta);
  }

  // Fallback: native COOK only (plain transfer)
  if (cookDelta != null && Math.abs(cookDelta) > 5000) {
    const cook = (Math.abs(cookDelta) / 1e9).toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
    return `${cook} COOK`;
  }

  return null;
}

// ── Description extraction ────────────────────────────────────────────────────

type ParsedTx = {
  meta?: { logMessages?: string[] | null } | null;
  transaction?: {
    message?: {
      instructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
    };
  };
} | null;

function extractDescription(tx: ParsedTx, sigInfo?: ConfirmedSignatureInfo): string {
  if (!tx) {
    if (sigInfo?.memo?.trim()) return sigInfo.memo.trim().slice(0, 64);
    return "Transaction";
  }

  const instructions = tx.transaction?.message?.instructions ?? [];
  const logs = tx.meta?.logMessages ?? [];

  const hasOpaqueOuter = instructions.some(
    (ix) => !("parsed" in ix) || ix.parsed == null
  );

  if (hasOpaqueOuter) {
    for (const log of logs) {
      if (/bridge|warp|hyperlane/i.test(log)) return "Bridge";
      if (/swap|exchange|route/i.test(log)) return "Swap";
    }
    return "Transaction";
  }

  for (const ix of instructions) {
    if ("parsed" in ix && typeof ix.parsed === "string" && ix.parsed.trim()) {
      return ix.parsed.trim().slice(0, 64);
    }
    if ("program" in ix && ix.program === "spl-memo") {
      const data = "data" in ix ? String(ix.data).slice(0, 64) : "";
      if (data) return data;
    }
  }

  for (const ix of instructions) {
    if ("parsed" in ix && ix.parsed && typeof ix.parsed === "object") {
      const p = ix.parsed as {
        type?: string;
        info?: { amount?: string; tokenAmount?: { uiAmountString?: string } };
      };
      if (p.type === "transfer" || p.type === "transferChecked") {
        const amt = p.info?.tokenAmount?.uiAmountString ?? p.info?.amount;
        if (amt) return `Token transfer: ${amt}`;
        return "Token transfer";
      }
    }
  }

  for (const ix of instructions) {
    if ("parsed" in ix && ix.parsed && typeof ix.parsed === "object") {
      const p = ix.parsed as { type?: string; info?: { lamports?: number } };
      if (p.type === "transfer" && p.info?.lamports != null) {
        const cook = (p.info.lamports / 1e9).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        });
        return `Transfer ${cook} COOK`;
      }
    }
  }

  return "Transaction";
}

// ── Route handler ─────────────────────────────────────────────────────────────

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;

export async function getActivity(req: Request, res: Response): Promise<void> {
  const wallet = (req.query["wallet"] as string | undefined)?.trim();
  const rawLimit = parseInt(
    (req.query["limit"] as string | undefined) ?? String(DEFAULT_LIMIT),
    10
  );
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

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
    const sigs = await conn.getSignaturesForAddress(pubkey, { limit });

    if (sigs.length === 0) {
      res.json({ wallet, transactions: [] });
      return;
    }

    const sigStrings = sigs.map((s) => s.signature);
    let parsedTxs: (Awaited<ReturnType<typeof conn.getParsedTransactions>>[number])[] = [];
    try {
      parsedTxs = await conn.getParsedTransactions(sigStrings, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
    } catch {
      parsedTxs = new Array(sigs.length).fill(null) as typeof parsedTxs;
    }

    const transactions: ActivityItem[] = sigs.map((sig, i) => {
      const tx = parsedTxs[i] ?? null;
      return {
        signature: sig.signature,
        blockTime: sig.blockTime ?? null,
        status: sig.err ? "failed" : "confirmed",
        description: extractDescription(tx, sig),
        amount: extractAmount(tx as ParsedTransactionWithMeta | null, wallet),
        slot: sig.slot,
      };
    });

    console.log(`[activity] ${wallet.slice(0, 8)}… → ${transactions.length} txs`);
    res.json({ wallet, transactions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[activity]", message);
    res.status(502).json({
      error: "Failed to fetch transaction history",
      hint: message,
    });
  }
}
