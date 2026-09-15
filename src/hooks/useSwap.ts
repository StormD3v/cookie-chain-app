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

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSwap(): UseSwapResult {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Keep a ref to the current wallet so the execute callback always reads
  // the latest signTransaction/sendTransaction without needing them in its
  // dependency array (which caused stale-closure bugs when the adapter's
  // method references changed between renders).
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const [state, setState] = useState<SwapState>(INITIAL);

  // Prevent stale async completions from overwriting newer state
  const execId = useRef(0);

  const set = useCallback((patch: Partial<SwapState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // ── getQuote ──────────────────────────────────────────────────────────────

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
          set({ stage: "error", error: msg });
        });
    },
    [set]
  );

  // ── openConfirm / cancelConfirm ───────────────────────────────────────────

  const openConfirm = useCallback(() => {
    set({ stage: "confirming" });
  }, [set]);

  const cancelConfirm = useCallback(() => {
    set({ stage: "quoted" });
  }, [set]);

  // ── execute ───────────────────────────────────────────────────────────────

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

    // Step 1: build the unsigned transaction via the proxy
    guard({ stage: "signing", error: null });
    let txBase64: string;
    try {
      const built = await buildSwapTx({
        multiRoute: state.multiRoute,
        userPublicKey: pk.toBase58(),
      });
      txBase64 = built.transactionBase64;
    } catch (err: unknown) {
      guard({ stage: "error", error: err instanceof Error ? err.message : "Failed to build transaction" });
      return;
    }

    if (execId.current !== id) return;

    // Steps 2–4: sign → submit → poll via shared utility
    const cancelSignal = { cancelled: false };
    try {
      const { signature } = await signAndSubmit(
        txBase64,
        walletRef.current,
        connection,
        (stage) => {
          // Map generic SendStage → SwapStage (they share the same names)
          guard({ stage: stage as SwapStage });
        },
        cancelSignal,
      );
      guard({ stage: "confirmed", signature });
    } catch (err: unknown) {
      if (execId.current !== id) return;
      guard({ stage: "error", error: err instanceof Error ? err.message : "Transaction failed" });
    }
  }, [state.multiRoute, connection, set]);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    ++execId.current; // invalidate any in-flight exec
    setState(INITIAL);
  }, []);

  return { ...state, getQuote, openConfirm, cancelConfirm, execute, reset };
}
