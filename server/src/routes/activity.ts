/**
 * GET /api/activity?wallet=<address>&limit=<n>
 *
 * Returns the wallet's recent transaction history from Cookie Chain by calling
 * getSignaturesForAddress directly against the Cookie Chain RPC, then fetching
 * a lightweight parsed view for each signature.
 *
 * Response shape:
 * {
 *   wallet: string,
 *   transactions: ActivityItem[]
 * }
 *
 * Each ActivityItem:
 * {
 *   signature: string,      // base58 tx signature
 *   blockTime: number|null, // unix seconds
 *   status: "confirmed"|"failed",
 *   description: string,    // best-effort: memo > token transfer label > "Transaction"
 *   slot: number
 * }
 */

import type { Request, Response } from "express";
import { Connection, PublicKey, type ParsedInstruction, type PartiallyDecodedInstruction } from "@solana/web3.js";

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

/**
 * Best-effort: extract a short human-readable description from a parsed tx.
 * Priority order:
 *   1. memo instruction text
 *   2. spl-token Transfer amount
 *   3. System program transfer (SOL/COOK)
 *   4. "Transaction" fallback
 */
function extractDescription(
  tx: {
    meta?: {
      logMessages?: string[] | null;
    } | null;
    transaction?: {
      message?: {
        instructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
      };
    };
  } | null
): string {
  if (!tx) return "Transaction";

  const instructions = tx.transaction?.message?.instructions ?? [];

  // 1. Memo
  for (const ix of instructions) {
    if ("parsed" in ix && typeof ix.parsed === "string" && ix.parsed.trim()) {
      const memo = ix.parsed.trim().slice(0, 64);
      return memo;
    }
    if ("program" in ix && ix.program === "spl-memo") {
      const data = "data" in ix ? String(ix.data).slice(0, 64) : "";
      if (data) return data;
    }
  }

  // 2. SPL token transfer
  for (const ix of instructions) {
    if ("parsed" in ix && ix.parsed && typeof ix.parsed === "object") {
      const p = ix.parsed as { type?: string; info?: { amount?: string; tokenAmount?: { uiAmountString?: string } } };
      if (p.type === "transfer" || p.type === "transferChecked") {
        const amt = p.info?.tokenAmount?.uiAmountString ?? p.info?.amount;
        if (amt) return `Token transfer: ${amt}`;
        return "Token transfer";
      }
    }
  }

  // 3. System transfer (native COOK)
  for (const ix of instructions) {
    if ("parsed" in ix && ix.parsed && typeof ix.parsed === "object") {
      const p = ix.parsed as { type?: string; info?: { lamports?: number } };
      if (p.type === "transfer" && p.info?.lamports != null) {
        const cook = (p.info.lamports / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
        return `Transfer ${cook} COOK`;
      }
    }
  }

  // 4. Log message hint (swap programs often emit "Program log: swap …")
  const logs = tx.meta?.logMessages ?? [];
  for (const log of logs) {
    const swapMatch = /swap|exchange|route/i.exec(log);
    if (swapMatch) return "Swap";
  }

  return "Transaction";
}

// ── Route handler ─────────────────────────────────────────────────────────────

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_LIMIT = 25;
const DEFAULT_LIMIT = 10;

export async function getActivity(req: Request, res: Response): Promise<void> {
  const wallet = (req.query["wallet"] as string | undefined)?.trim();
  const rawLimit = parseInt((req.query["limit"] as string | undefined) ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
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

    // Step 1: fetch signatures (fast — single RPC call)
    const sigs = await conn.getSignaturesForAddress(pubkey, { limit });

    if (sigs.length === 0) {
      res.json({ wallet, transactions: [] });
      return;
    }

    // Step 2: fetch parsed transactions for description extraction.
    // Use a short per-call timeout — if RPC is slow we fall back to "Transaction".
    const sigStrings = sigs.map((s) => s.signature);

    let parsedTxs: (Awaited<ReturnType<typeof conn.getParsedTransactions>>[number])[] = [];
    try {
      parsedTxs = await conn.getParsedTransactions(sigStrings, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
    } catch {
      // Non-fatal — we'll fall back to "Transaction" for all descriptions
      parsedTxs = new Array(sigs.length).fill(null) as typeof parsedTxs;
    }

    // Step 3: normalise into ActivityItem[]
    const transactions: ActivityItem[] = sigs.map((sig, i) => ({
      signature: sig.signature,
      blockTime: sig.blockTime ?? null,
      status: sig.err ? "failed" : "confirmed",
      description: extractDescription(parsedTxs[i] ?? null),
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
