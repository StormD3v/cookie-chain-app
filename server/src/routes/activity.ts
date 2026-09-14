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
  slot: number;
}

// ── Description extraction ────────────────────────────────────────────────────
//
// Priority (corrected order):
//   1. Any outer opaque instruction → "Swap" (DEX programs are never fully
//      parsed by the RPC; their presence means this is a DEX interaction,
//      NOT a plain transfer). This must run BEFORE the token-transfer check
//      to avoid swap legs being misclassified as "Token transfer".
//   2. Log message contains swap/exchange/bridge/route keyword.
//   3. Memo instruction text.
//   4. SPL token transfer in outer instructions (only if no opaque ix found).
//   5. System program transfer.
//   6. "Transaction" fallback.
//
// Note: we intentionally do NOT scan inner instructions for token transfers.
// Inner instructions are DEX internals (swap legs, fee transfers) — including
// them caused swap transactions to be labelled "Token transfer".

type ParsedTx = {
  meta?: { logMessages?: string[] | null } | null;
  transaction?: {
    message?: {
      instructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
    };
  };
} | null;

function extractDescription(tx: ParsedTx, sigInfo?: ConfirmedSignatureInfo): string {
  // If the RPC returned null for this tx (rate limit / timeout), fall back
  // gracefully using the memo field from the signature info.
  if (!tx) {
    if (sigInfo?.memo?.trim()) return sigInfo.memo.trim().slice(0, 64);
    return "Transaction";
  }

  const instructions = tx.transaction?.message?.instructions ?? [];
  const logs = tx.meta?.logMessages ?? [];

  // ── 1. Opaque outer instruction = DEX / program interaction ──────────────
  // An "opaque" instruction is one the RPC couldn't parse — it has `data`
  // and `accounts` but no `parsed` object. Cookiebox CLMM, DAMM, and
  // Hyperlane warp all appear this way. If ANY outer ix is opaque, this
  // is not a plain transfer.
  const hasOpaqueOuter = instructions.some(
    (ix) => !("parsed" in ix) || ix.parsed == null
  );

  if (hasOpaqueOuter) {
    // ── 2. Log message refines the opaque-ix label ────────────────────────
    for (const log of logs) {
      if (/bridge|warp|hyperlane/i.test(log)) return "Bridge";
      if (/swap|exchange|route/i.test(log)) return "Swap";
    }
    // Unknown DEX interaction — better than "Token transfer"
    return "Transaction";
  }

  // ── 3. Memo (only reached when all outer ixs are fully parsed) ───────────
  for (const ix of instructions) {
    if ("parsed" in ix && typeof ix.parsed === "string" && ix.parsed.trim()) {
      return ix.parsed.trim().slice(0, 64);
    }
    if ("program" in ix && ix.program === "spl-memo") {
      const data = "data" in ix ? String(ix.data).slice(0, 64) : "";
      if (data) return data;
    }
  }

  // ── 4. SPL token transfer ─────────────────────────────────────────────────
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

  // ── 5. System program transfer (native COOK) ──────────────────────────────
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

    // Step 1: fetch signatures — always succeeds, carries memo + blockTime
    const sigs = await conn.getSignaturesForAddress(pubkey, { limit });

    if (sigs.length === 0) {
      res.json({ wallet, transactions: [] });
      return;
    }

    // Step 2: fetch parsed transactions for richer description extraction.
    // Non-fatal: if the call fails or returns null entries, extractDescription
    // falls back gracefully using the sigInfo memo field.
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

    // Step 3: normalise — pass sigInfo so null-tx fallback can use memo
    const transactions: ActivityItem[] = sigs.map((sig, i) => ({
      signature: sig.signature,
      blockTime: sig.blockTime ?? null,
      status: sig.err ? "failed" : "confirmed",
      description: extractDescription(parsedTxs[i] ?? null, sig),
      slot: sig.slot,
    }));

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
