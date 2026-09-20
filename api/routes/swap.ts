/**
 * Swap routes — server-side, no wallet key involved.
 *
 * POST /api/swap/quote   — get a quote; returns human-readable quote + opaque multiRoute
 * POST /api/swap/build   — build unsigned tx; returns base64 for client to sign
 * POST /api/swap/submit  — submit a transaction already signed by the client
 * GET  /api/swap/confirm/:signature — poll for confirmation
 */

import type { Request, Response } from "express";
import {
  quoteMultiRoute,
  buildSwapTx,
  submitSignedTx,
  confirmTx,
  type MultiRoute,
} from "../lib/candyShop.js";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function badRequest(res: Response, msg: string): void {
  res.status(400).json({ error: msg });
}

function serverError(res: Response, context: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : "Internal error";
  console.error(`[swap/${context}]`, msg);
  // Don't leak internal error details to the client
  res.status(502).json({ error: `Swap ${context} failed` });
}

/**
 * Convert a UI amount string ("10.5") to a raw integer string given decimals.
 * Returns null if the input is not a valid positive number.
 */
function uiToRaw(uiAmount: string, decimals: number): string | null {
  const n = Number(uiAmount);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Use BigInt arithmetic to avoid floating-point precision loss
  const factor = BigInt(10 ** decimals);
  // Split on decimal point to handle fractional amounts
  const [whole = "0", frac = ""] = uiAmount.split(".");
  const fracPadded = frac.slice(0, decimals).padEnd(decimals, "0");
  try {
    const raw = BigInt(whole) * factor + BigInt(fracPadded || "0");
    return raw.toString();
  } catch {
    return null;
  }
}

/**
 * POST /api/swap/quote
 * Returns the formatted quote plus the raw multiRoute object
 * (opaque — pass back to /build unchanged).
 */
export async function postSwapQuote(req: Request, res: Response): Promise<void> {
  const { inputMint, outputMint, amount, slippageBps } = req.body as {
    inputMint?: string;
    outputMint?: string;
    amount?: string;
    slippageBps?: number;
  };

  if (!inputMint || !BASE58.test(inputMint)) {
    badRequest(res, "inputMint must be a valid base58 mint address"); return;
  }
  if (!outputMint || !BASE58.test(outputMint)) {
    badRequest(res, "outputMint must be a valid base58 mint address"); return;
  }
  if (!amount || typeof amount !== "string") {
    badRequest(res, "amount must be a string UI amount, e.g. \"10.5\""); return;
  }
  if (inputMint === outputMint) {
    badRequest(res, "inputMint and outputMint must be different"); return;
  }

  const slip = typeof slippageBps === "number" ? slippageBps : 500;
  if (!Number.isInteger(slip) || slip < 0 || slip > 10_000) {
    badRequest(res, "slippageBps must be an integer 0–10000"); return;
  }

  // Decimals for known mints. Matches KNOWN_TOKENS in SwapPanel.tsx.
  // If an unknown mint is submitted Candy Shop will reject a wrong raw amount
  // anyway — defaulting to 9 is safe for all Cookie Chain native-token cases.
  const MINT_DECIMALS: Record<string, number> = {
    "So11111111111111111111111111111111111111112": 9,  // COOK
    "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": 9,  // bCOOK
    "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": 6,  // CHAT
  };
  const inDecimals = MINT_DECIMALS[inputMint] ?? 9;

  const rawAmount = uiToRaw(amount, inDecimals);
  if (!rawAmount) {
    badRequest(res, `Invalid amount "${amount}" — must be a positive number`); return;
  }

  try {
    const { multiRoute } = await quoteMultiRoute({
      inputMint,
      outputMint,
      amount: rawAmount,
      slippageBps: slip,
    });

    if (!multiRoute?.segments?.length) {
      res.status(404).json({
        error: "No route found for this pair",
        hint: "The pair may lack liquidity. Try a smaller amount or a more liquid token.",
      });
      return;
    }

    if (multiRoute.lowLiquidity) {
      res.status(422).json({
        error: "Low liquidity — this swap would move the price significantly",
        hint: "Reduce the amount or choose a more liquid token.",
      });
      return;
    }

    const gross = multiRoute.grossOutAmount ?? multiRoute.totalOutAmount;
    const quote = {
      inputMint,
      outputMint,
      amountIn: amount,
      expectedOut: gross,
      outAfterFee: multiRoute.totalOutAmount,
      minOut: multiRoute.minOutAmount,
      priceImpactPct: `${Math.max(0, multiRoute.combinedPriceImpactPct ?? 0).toFixed(3)}%`,
      candyShopFeeBps: multiRoute.protocolFeeBps ?? null,
      slippageBps: slip,
      route: {
        split: Boolean(multiRoute.isSplit),
        multiHop: Boolean(multiRoute.isMultiHop),
        venues: [...new Set(
          multiRoute.segments.map((s) => s.programName ?? s.venue ?? s.dex ?? "Unknown")
        )],
      },
    };

    res.json({ quote, multiRoute });
  } catch (err) {
    serverError(res, "quote", err);
  }
}

/**
 * POST /api/swap/build
 * Takes the multiRoute from /quote and the user's public key.
 * Returns { transactionBase64 } — unsigned, ready for Nightly to sign.
 */
export async function postSwapBuild(req: Request, res: Response): Promise<void> {
  const { multiRoute, userPublicKey } = req.body as {
    multiRoute?: MultiRoute;
    userPublicKey?: string;
  };

  if (!userPublicKey || !BASE58.test(userPublicKey)) {
    badRequest(res, "userPublicKey must be a valid base58 address"); return;
  }
  if (!multiRoute?.segments?.length) {
    badRequest(res, "multiRoute is required and must have at least one segment"); return;
  }

  try {
    const result = await buildSwapTx(multiRoute, userPublicKey);
    res.json({ transactionBase64: result.transactionBase64 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[swap/build]", msg);
    // Forward the Candy Shop error text so the client can show a specific message
    res.status(502).json({ error: msg });
  }
}
}

/**
 * POST /api/swap/submit
 * Accepts the signed transaction (base64) from the frontend and submits it.
 */
export async function postSwapSubmit(req: Request, res: Response): Promise<void> {
  const { signedTransactionBase64 } = req.body as {
    signedTransactionBase64?: string;
  };

  if (!signedTransactionBase64 || typeof signedTransactionBase64 !== "string") {
    badRequest(res, "signedTransactionBase64 is required"); return;
  }

  try {
    const result = await submitSignedTx(signedTransactionBase64);
    res.json({ signature: result.signature, confirmed: result.confirmed });
  } catch (err) {
    serverError(res, "submit", err);
  }
}

/**
 * GET /api/swap/confirm/:signature
 * Polls Candy Shop for confirmation status of a submitted transaction.
 */
export async function getSwapConfirm(req: Request, res: Response): Promise<void> {
  const { signature } = req.params as { signature?: string };

  if (!signature || signature.length < 32) {
    badRequest(res, "signature is required"); return;
  }

  try {
    const result = await confirmTx(signature);
    res.json({ confirmed: result.confirmed, error: result.error ?? null });
  } catch (err) {
    serverError(res, "confirm", err);
  }
}
