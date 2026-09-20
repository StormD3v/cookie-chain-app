import { useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type {
  SwapStage,
  SwapQuote,
  MultiRoute,
} from "../types/cookie";
import {
  fetchSwapQuote,
  buildSwapTx,
} from "../api/cookieMcp";
import { signAndSubmit } from "../lib/signAndSubmit";

// ── State shape ──────────────────────────────────────────────────────────────

export interface SwapState {
  stage: SwapStage;
  quote: SwapQuote | null;
  /** Opaque — returned from /quote, sent back to /build verbatim */
  multiRoute: MultiRoute | null;
  /** Tx signature once submitted */
  signature: string | null;
  /** Human-readable error */
  error: string | null;
}

export interface UseSwapResult extends SwapState {
  /** Fetch a quote for the given pair + amount. Transitions: idle → quoting → quoted | error */
  getQuote: (params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
  }) => void;
  /** Open the confirm modal (quoted → confirming) */
  openConfirm: () => void;
  /** User cancelled the confirm modal — back to quoted */
  cancelConfirm: () => void;
  /** Execute: build → sign → submit → poll. Transitions: confirming → signing → submitting → pending → confirmed | error */
  execute: () => Promise<void>;
  /** Reset entirely back to idle */
  reset: () => void;
}

const INITIAL: SwapState = {
  stage: "idle",
  quote: null,
  multiRoute: null,
  signature: null,
  error: null,
};

function friendlySwapError(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("no route") || s.includes("route found")) return "No route found for this pair.";
  if (s.includes("low liquidity") || s.includes("liquidity")) return "Liquidity too low. Try a smaller amount.";
  if (s.includes("account_error") || s.includes("token account not found")) return "No token account for the output token. Use a wallet that has held it before.";
  if (s.includes("amount") && (s.includes("too low") || s.includes("too small") || s.includes("minimum"))) return "Amount too low for this swap.";
  if (s.includes("slippage")) return "Slippage exceeded. Try again or increase slippage tolerance.";
  if (s.includes("invalid amount") || s.includes("must be a positive")) return "Enter a valid positive amount.";
  if (s.includes("wallet not connected")) return "Wallet not connected.";
  return "Swap failed. Try a different amount or pair.";
}

export function useSwap(): UseSwapResult {
  const { connection } = useConnection();
  const wallet = useWallet();

  // walletRef: execute() reads the latest signTransaction/sendTransaction
  // without listing them as deps — avoids stale-closure bugs when the adapter's
  // method references change between renders.
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const [state, setState] = useState<SwapState>(INITIAL);

  // execId guards against stale async completions overwriting newer state.
  const execId = useRef(0);

  const set = useCallback((patch: Partial<SwapState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const getQuote = useCallback(
    (params: {
      inputMint: string;
      outputMint: string;
      amount: string;
      slippageBps?: number;
    }) => {
      set({ stage: "quoting", error: null, quote: null, multiRoute: null });

      fetchSwapQuote(params)
        .then(({ quote, multiRoute }) => {
          set({ stage: "quoted", quote, multiRoute });
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to get quote";
          set({ stage: "error", error: friendlySwapError(msg) });
        });
    },
    [set]
  );

  const openConfirm = useCallback(() => {
    set({ stage: "confirming" });
  }, [set]);

  const cancelConfirm = useCallback(() => {
    set({ stage: "quoted" });
  }, [set]);

  const execute = useCallback(async () => {
    const { publicKey: pk } = walletRef.current;

    if (!pk) {
      set({ stage: "error", error: "Wallet not connected" });
      return;
    }
    if (!state.multiRoute) {
      set({ stage: "error", error: "No route available — get a quote first" });
      return;
    }

    const id = ++execId.current;
    const guard = (patch: Partial<SwapState>) => {
      if (execId.current === id) setState((s) => ({ ...s, ...patch }));
    };

    guard({ stage: "signing", error: null });
    let txBase64: string;
    try {
      const built = await buildSwapTx({
        multiRoute: state.multiRoute,
        userPublicKey: pk.toBase58(),
      });
      txBase64 = built.transactionBase64;
    } catch (err: unknown) {
      guard({ stage: "error", error: friendlySwapError(err instanceof Error ? err.message : "Failed to build transaction") });
      return;
    }

    if (execId.current !== id) return;

    const cancelSignal = { cancelled: false };
    try {
      const { signature } = await signAndSubmit(
        txBase64,
        walletRef.current,
        connection,
        (stage) => {
          // SendStage and SwapStage share the same string values.
          guard({ stage: stage as SwapStage });
        },
        cancelSignal,
      );
      guard({ stage: "confirmed", signature });
    } catch (err: unknown) {
      if (execId.current !== id) return;
      guard({ stage: "error", error: friendlySwapError(err instanceof Error ? err.message : "Transaction failed") });
    }
  }, [state.multiRoute, connection, set]);

  const reset = useCallback(() => {
    ++execId.current; // invalidate any in-flight exec
    setState(INITIAL);
  }, []);

  return { ...state, getQuote, openConfirm, cancelConfirm, execute, reset };
}
