/**
 * Candy Shop aggregator HTTP client.
 *
 * Wraps the three Candy Shop endpoints the swap flow needs:
 *   - quoteMultiRoute  — read-only, no key
 *   - buildSwapTx      — read-only, no key; returns unsigned tx for client signing
 *   - submitSignedTx   — submits a transaction the client already signed
 *   - confirmTx        — polls confirmation status
 *
 * The base URL defaults to https://swap.cookiescan.io/api and can be
 * overridden via COOKIE_SWAP_API_URL.
 */

const BASE =
  (process.env["COOKIE_SWAP_API_URL"] ?? "https://swap.cookiescan.io/api").replace(/\/$/, "");

// ── Shared fetch helper ──────────────────────────────────────────────────────

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await res.json() as T & { error?: string; message?: string };

  if (!res.ok) {
    const msg = (body as { error?: string; message?: string }).error
      ?? (body as { message?: string }).message
      ?? `Candy Shop API error ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RouteSegment {
  venue: string;
  poolAddress: string;
  inAmount: string;
  outAmount: string;
  programName?: string;
  dex?: string;
}

export interface MultiRoute {
  totalInAmount: string;
  totalOutAmount: string;
  grossOutAmount?: string;
  minOutAmount: string;
  combinedPriceImpactPct?: number;
  protocolFeeBps?: number;
  protocolFeeAmount?: string;
  isSplit?: boolean;
  isMultiHop?: boolean;
  lowLiquidity?: boolean;
  segments: RouteSegment[];
}

export interface QuoteResult {
  multiRoute: MultiRoute;
}

export interface BuildTxResult {
  transactionBase64: string;
}

export interface SubmitTxResult {
  signature: string;
  confirmed: boolean;
}

export interface ConfirmTxResult {
  confirmed: boolean;
  error?: string;
}

// ── API calls ────────────────────────────────────────────────────────────────

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  /** Raw integer amount (already multiplied by decimals) */
  amount: string;
  slippageBps: number;
}

/** GET /quote/multi-route — no key needed */
export async function quoteMultiRoute(params: QuoteParams): Promise<QuoteResult> {
  const q = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });
  return api<QuoteResult>(`/quote/multi-route?${q.toString()}`);
}

/** POST /swap-tx/multi-route — builds unsigned tx, no key needed */
export async function buildSwapTx(
  multiRoute: MultiRoute,
  userPublicKey: string
): Promise<BuildTxResult> {
  return api<BuildTxResult>("/swap-tx/multi-route", {
    method: "POST",
    body: JSON.stringify({ multiRoute, userPublicKey }),
  });
}

/** POST /submit-tx — submit a transaction already signed by the user */
export async function submitSignedTx(
  signedTransactionBase64: string
): Promise<SubmitTxResult> {
  return api<SubmitTxResult>("/submit-tx", {
    method: "POST",
    body: JSON.stringify({ signedTransactionBase64 }),
  });
}

/** GET /confirm-tx/:signature — poll for confirmation */
export async function confirmTx(
  signature: string,
  poolAddresses: string[] = []
): Promise<ConfirmTxResult> {
  const pools =
    poolAddresses.length > 0
      ? `?pools=${poolAddresses.map(encodeURIComponent).join(",")}`
      : "";
  return api<ConfirmTxResult>(`/confirm-tx/${encodeURIComponent(signature)}${pools}`);
}
