/**
 * A single token balance entry returned by the cookie-mcp proxy.
 * Shape mirrors what cookie-mcp's get_balance tool returns for each token.
 */
export interface TokenBalance {
  /** SPL mint address */
  mint: string;
  /** Token ticker, e.g. "COOK" */
  symbol?: string;
  /** Full token name */
  name?: string;
  /** Human-readable amount (already divided by decimals) */
  uiAmount: number | null;
  /** Raw amount as a string to avoid precision loss */
  rawAmount: string;
  /** Number of decimals */
  decimals: number;
  /** USD value if price data is available */
  usdValue?: number | null;
}

/** Response shape from GET /api/balances?wallet=<address> */
export interface BalancesResponse {
  wallet: string;
  balances: TokenBalance[];
}

/** Error shape from the proxy server */
export interface ApiError {
  error: string;
  hint?: string;
}

// ── Swap types ───────────────────────────────────────────────────────────────

/** A known token the user can select in the swap UI */
export interface SwapToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
}

/** Human-readable swap quote returned by POST /api/swap/quote */
export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  amountIn: string;
  /** Raw output amount string (divide by output decimals for display) */
  expectedOut: string;
  outAfterFee: string;
  minOut: string;
  priceImpactPct: string;
  candyShopFeeBps: number | null;
  slippageBps: number;
  route: {
    split: boolean;
    multiHop: boolean;
    venues: string[];
  };
}

/**
 * Opaque multiRoute object returned alongside the quote.
 * Must be passed back verbatim to /api/swap/build — do not modify.
 */
export type MultiRoute = Record<string, unknown>;

/** Response from POST /api/swap/quote */
export interface SwapQuoteResponse {
  quote: SwapQuote;
  multiRoute: MultiRoute;
}

/** Response from POST /api/swap/build */
export interface SwapBuildResponse {
  /** Base64-encoded unsigned VersionedTransaction */
  transactionBase64: string;
}

/** Response from POST /api/swap/submit */
export interface SwapSubmitResponse {
  signature: string;
  confirmed: boolean;
}

/** Response from GET /api/swap/confirm/:signature */
export interface SwapConfirmResponse {
  confirmed: boolean;
  error: string | null;
}

/**
 * All possible states of the swap transaction flow.
 *
 *   idle → quoting → quoted → confirming → signing →
 *   submitting → pending → confirmed
 *                                        ↘ error
 */
export type SwapStage =
  | "idle"          // no quote yet
  | "quoting"       // fetching quote
  | "quoted"        // quote ready, waiting for user to click Confirm
  | "confirming"    // user reviewing in modal
  | "signing"       // waiting for Nightly approval
  | "submitting"    // signed, submitting to chain
  | "pending"       // submitted, polling confirmation
  | "confirmed"     // tx confirmed on-chain
  | "error";        // any failure

// ── Activity feed types ───────────────────────────────────────────────────────

/** A single transaction entry from GET /api/activity */
export interface ActivityItem {
  signature: string;
  blockTime: number | null;
  status: "confirmed" | "failed";
  description: string;
  slot: number;
}

/** Response from GET /api/activity?wallet=<address> */
export interface ActivityResponse {
  wallet: string;
  transactions: ActivityItem[];
}
