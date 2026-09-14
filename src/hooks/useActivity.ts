import { useState, useCallback, useRef, useEffect } from "react";
import type { ActivityItem } from "../types/cookie";
import { fetchActivity } from "../api/cookieMcp";

interface UseActivityResult {
  transactions: ActivityItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ── Retry config ──────────────────────────────────────────────────────────────
//
// The first-load error ("Crumbs. Something went wrong.") is a cold-start race:
// the frontend fires useActivity as soon as the wallet connects, but the
// backend proxy or the Cookie Chain RPC may not have finished initialising.
// Solution: silent retry with exponential backoff before surfacing the error.
//
// Attempt timeline: 0ms → 1.5s → 3s → give up and show error
const RETRY_DELAYS_MS = [1500, 3000] as const;

async function fetchWithRetry(
  walletAddress: string,
  signal: { cancelled: boolean }
): Promise<ActivityItem[]> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      // Wait before retrying; bail out if the fetch was superseded
      await new Promise<void>((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1])
      );
      if (signal.cancelled) return [];
    }

    try {
      const res = await fetchActivity(walletAddress);
      return res.transactions;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry 4xx validation errors — they won't resolve themselves
      if (lastError.message.includes("400") || lastError.message.includes("Invalid")) {
        throw lastError;
      }
      // Otherwise keep retrying (502, network error, timeout)
    }
  }

  throw lastError;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the wallet's recent transaction history from Cookie Chain.
 * Auto-fetches on mount and whenever walletAddress changes.
 * Silently retries up to 2 times on transient errors before surfacing the
 * error state — prevents the first-load failure when the backend is still
 * warming up.
 */
export function useActivity(walletAddress: string): UseActivityResult {
  const [transactions, setTransactions] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stale-fetch cancellation token — incremented on each new fetch
  const fetchId = useRef(0);

  const refetch = useCallback(() => {
    if (!walletAddress) return;

    const id = ++fetchId.current;
    // Shared cancellation signal for the retry loop
    const signal = { cancelled: false };

    setLoading(true);
    setError(null);

    fetchWithRetry(walletAddress, signal)
      .then((txs) => {
        if (fetchId.current !== id) return;
        setTransactions(txs);
      })
      .catch((err: unknown) => {
        if (fetchId.current !== id) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setTransactions([]);
      })
      .finally(() => {
        if (fetchId.current === id) setLoading(false);
        signal.cancelled = true;
      });

    // If the wallet changes before retries finish, cancel the in-flight loop
    return () => { signal.cancelled = true; };
  }, [walletAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { transactions, loading, error, refetch };
}
