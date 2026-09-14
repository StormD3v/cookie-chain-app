/**
 * GET /api/balances?wallet=<address>
 *
 * Calls cookie-mcp's get_balance tool (read-only, no key needed) and
 * normalises the response into the BalancesResponse shape the frontend expects.
 *
 * Actual cookie-mcp 0.3.x response shape (confirmed from live MCP output):
 * {
 *   wallet: "...",
 *   cook: { amount: "3530.641219", usdValue: 0.29 },   ← native COOK
 *   tokens: [],                                          ← SPL tokens (may be empty)
 *   totalUsd: 0.29
 * }
 *
 * Note: the `cook` field uses a plain amount string, NOT the
 * { uiAmount, rawAmount, decimals } shape that was assumed when this handler
 * was first written against a different version of the tool.
 */

import type { Request, Response } from "express";
import { callTool } from "../mcpClient.js";

// ── Types matching actual cookie-mcp 0.3.x get_balance output ─────────────

interface McpCookEntry {
  /** Human-readable amount string, e.g. "3530.641219" */
  amount: string;
  usdValue?: number | null;
}

interface McpSplEntry {
  mint: string;
  symbol?: string;
  name?: string;
  /** Human-readable amount (post-decimals) */
  uiAmount?: number | null;
  /** Raw integer amount string */
  rawAmount?: string;
  decimals?: number;
  usdValue?: number | null;
}

interface McpBalanceResult {
  wallet: string;
  /** Native COOK balance — present in cookie-mcp 0.3.x */
  cook?: McpCookEntry;
  /** SPL / Token-2022 token balances */
  tokens?: McpSplEntry[];
  totalUsd?: number | null;
  /** Error fields */
  error?: string;
  hint?: string;
}

// ── Normalised entry the frontend expects ─────────────────────────────────

interface NormalisedBalance {
  mint: string;
  symbol: string;
  name: string;
  uiAmount: number | null;
  rawAmount: string;
  decimals: number;
  usdValue: number | null;
}

// Native COOK mint on Cookie Chain (same address as wSOL on Solana —
// the chain context here is Cookie Chain, not Solana)
const COOK_MINT = "So11111111111111111111111111111111111111112";
const COOK_DECIMALS = 9;

function cookEntryToNormalised(cook: McpCookEntry): NormalisedBalance {
  const uiAmount = Number(cook.amount);
  // Reconstruct a raw amount from the decimal string to preserve precision
  const rawAmount = amountStringToRaw(cook.amount, COOK_DECIMALS);
  return {
    mint: COOK_MINT,
    symbol: "COOK",
    name: "Cookie (native)",
    uiAmount: Number.isFinite(uiAmount) ? uiAmount : null,
    rawAmount,
    decimals: COOK_DECIMALS,
    usdValue: cook.usdValue ?? null,
  };
}

function splEntryToNormalised(t: McpSplEntry): NormalisedBalance {
  const dec = t.decimals ?? 6;
  const uiAmount = t.uiAmount ?? null;
  const rawAmount =
    t.rawAmount ??
    (uiAmount != null ? amountStringToRaw(String(uiAmount), dec) : "0");
  return {
    mint: t.mint,
    symbol: t.symbol ?? t.mint.slice(0, 6),
    name: t.name ?? t.symbol ?? t.mint.slice(0, 6),
    uiAmount,
    rawAmount,
    decimals: dec,
    usdValue: t.usdValue ?? null,
  };
}

/** Convert a decimal amount string ("3530.641219") to a raw integer string */
function amountStringToRaw(amount: string, decimals: number): string {
  try {
    const [whole = "0", frac = ""] = amount.split(".");
    const fracPadded = frac.slice(0, decimals).padEnd(decimals, "0");
    const factor = BigInt(10 ** decimals);
    const raw = BigInt(whole) * factor + BigInt(fracPadded || "0");
    return raw.toString();
  } catch {
    return "0";
  }
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function getBalances(req: Request, res: Response): Promise<void> {
  const wallet = (req.query["wallet"] as string | undefined)?.trim();

  if (!wallet) {
    res.status(400).json({ error: "Missing ?wallet= query parameter" });
    return;
  }

  // Basic base58 sanity check (32–44 chars, no I/O/l/0)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const result = await callTool<McpBalanceResult>("get_balance", { wallet });

    if (result.error) {
      res.status(502).json({ error: result.error, hint: result.hint });
      return;
    }

    const balances: NormalisedBalance[] = [];

    // Native COOK — cookie-mcp 0.3.x returns this under `cook`
    if (result.cook && result.cook.amount) {
      balances.push(cookEntryToNormalised(result.cook));
    }

    // SPL / Token-2022 tokens
    if (Array.isArray(result.tokens)) {
      for (const t of result.tokens) {
        if (t.mint) balances.push(splEntryToNormalised(t));
      }
    }

    res.json({ wallet, balances });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[balances]", message);
    res.status(502).json({ error: "Failed to fetch balances from cookie-mcp", hint: message });
  }
}
