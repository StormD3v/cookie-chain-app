import type {
  BalancesResponse,
  ApiError,
  SwapQuoteResponse,
  SwapBuildResponse,
  SwapSubmitResponse,
  SwapConfirmResponse,
  MultiRoute,
} from "../types/cookie";

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const body = (await res.json()) as T | ApiError;

  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(err.hint ?? err.error ?? `HTTP ${res.status}`);
  }

  return body as T;
}

// ── Balances ──────────────────────────────────────────────────────────────────

/**
 * Fetch token balances for a wallet address via the local cookie-mcp proxy.
 * Read-only — no key required.
 */
export async function fetchBalances(walletAddress: string): Promise<BalancesResponse> {
  return apiFetch<BalancesResponse>(
    `/api/balances?wallet=${encodeURIComponent(walletAddress)}`
  );
}

// ── Swap ──────────────────────────────────────────────────────────────────────

/**
 * Get a swap quote. Returns the human-readable quote and the opaque multiRoute
 * object that must be passed back to buildSwapTx unchanged.
 */
export async function fetchSwapQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}): Promise<SwapQuoteResponse> {
  return apiFetch<SwapQuoteResponse>("/api/swap/quote", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Build an unsigned VersionedTransaction for the given multiRoute.
 * The returned base64 string is ready for the user's wallet to sign.
 */
export async function buildSwapTx(params: {
  multiRoute: MultiRoute;
  userPublicKey: string;
}): Promise<SwapBuildResponse> {
  return apiFetch<SwapBuildResponse>("/api/swap/build", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Submit a signed transaction (base64) to the chain via the proxy.
 * The proxy forwards to the Candy Shop submit-tx endpoint.
 */
export async function submitSwapTx(
  signedTransactionBase64: string
): Promise<SwapSubmitResponse> {
  return apiFetch<SwapSubmitResponse>("/api/swap/submit", {
    method: "POST",
    body: JSON.stringify({ signedTransactionBase64 }),
  });
}

/**
 * Poll confirmation status for a submitted transaction signature.
 */
export async function fetchSwapConfirm(
  signature: string
): Promise<SwapConfirmResponse> {
  return apiFetch<SwapConfirmResponse>(
    `/api/swap/confirm/${encodeURIComponent(signature)}`
  );
}

// ── Activity ──────────────────────────────────────────────────────────────────

import type { ActivityResponse } from "../types/cookie";

/**
 * Fetch recent transaction history for a wallet from the Cookie Chain RPC.
 */
export async function fetchActivity(
  walletAddress: string,
  limit = 10
): Promise<ActivityResponse> {
  return apiFetch<ActivityResponse>(
    `/api/activity?wallet=${encodeURIComponent(walletAddress)}&limit=${limit}`
  );
}
