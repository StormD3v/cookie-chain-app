import { useState, useCallback, useRef, useEffect } from "react";
import type { TokenBalance } from "../types/cookie";
import { fetchBalances } from "../api/cookieMcp";

interface UseTokenBalancesResult {
  balances: TokenBalance[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches token balances for the given wallet address.
 * Runs automatically on mount and whenever walletAddress changes.
 * Stale responses from superseded fetches are silently dropped.
 */
export function useTokenBalances(walletAddress: string): UseTokenBalancesResult {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  // Start in loading state to prevent a flash of "no balances" on first render
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation token — increments on each new fetch to invalidate prior ones
  const fetchId = useRef(0);

  const refetch = useCallback(() => {
    if (!walletAddress) return;

    const id = ++fetchId.current;
    setLoading(true);
    setError(null);

    fetchBalances(walletAddress)
      .then((res) => {
        if (fetchId.current !== id) return; // stale, discard
        setBalances(res.balances);
      })
      .catch((err: unknown) => {
        if (fetchId.current !== id) return;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        setBalances([]);
      })
      .finally(() => {
        if (fetchId.current === id) setLoading(false);
      });
  }, [walletAddress]);

  // Auto-fetch whenever the wallet address changes
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { balances, loading, error, refetch };
}
