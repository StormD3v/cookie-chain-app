import { useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction, Transaction } from "@solana/web3.js";
import type {
  SwapStage,
  SwapQuote,
  MultiRoute,
} from "../types/cookie";
import {
  fetchSwapQuote,
  buildSwapTx,
  submitSwapTx,
  fetchSwapConfirm,
} from "../api/cookieMcp";

// ── Constants ────────────────────────────────────────────────────────────────

/** Poll confirmation every N ms until confirmed or timeout */
const CONFIRM_POLL_MS = 2_500;
/** Give up polling after this many ms (90 s) */
const CONFIRM_TIMEOUT_MS = 90_000;

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
  const { publicKey, signTransaction } = useWallet();
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
    if (!publicKey) {
      set({ stage: "error", error: "Wallet not connected" });
      return;
    }
    if (!signTransaction) {
      set({ stage: "error", error: "Wallet does not support signTransaction" });
      return;
    }
    if (!state.multiRoute) {
      set({ stage: "error", error: "No route available — get a quote first" });
      return;
    }

    const id = ++execId.current;

    const guard = (next: Partial<SwapState>) => {
      if (execId.current === id) setState((s) => ({ ...s, ...next }));
    };

    // ── Step 1: build unsigned tx ──────────────────────────────────────────
    guard({ stage: "signing", error: null });

    let txBase64: string;
    try {
      const built = await buildSwapTx({
        multiRoute: state.multiRoute,
        userPublicKey: publicKey.toBase58(),
      });
      txBase64 = built.transactionBase64;
    } catch (err: unknown) {
      guard({ stage: "error", error: err instanceof Error ? err.message : "Failed to build transaction" });
      return;
    }

    if (execId.current !== id) return;

    // ── Step 2: deserialise and sign with Nightly ──────────────────────────
    let signedBase64: string;
    try {
      const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));

      // Candy Shop returns VersionedTransactions; fall back to legacy if needed
      let signed: VersionedTransaction | Transaction;
      try {
        const vt = VersionedTransaction.deserialize(txBytes);
        signed = await signTransaction(vt as Parameters<typeof signTransaction>[0]);
      } catch {
        const lt = Transaction.from(txBytes);
        // Freshen the blockhash so the tx doesn't expire before we can submit
        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        lt.recentBlockhash = blockhash;
        lt.lastValidBlockHeight = lastValidBlockHeight;
        signed = await signTransaction(lt as Parameters<typeof signTransaction>[0]);
      }

      // Re-serialise to base64 for the proxy
      const serialised =
        signed instanceof VersionedTransaction
          ? signed.serialize()
          : signed.serialize();
      signedBase64 = btoa(String.fromCharCode(...serialised));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signing failed";
      // User rejection lands here — make it readable
      const isRejection =
        msg.toLowerCase().includes("reject") ||
        msg.toLowerCase().includes("cancelled") ||
        msg.toLowerCase().includes("denied");
      guard({
        stage: "error",
        error: isRejection ? "Transaction rejected in wallet" : `Signing failed: ${msg}`,
      });
      return;
    }

    if (execId.current !== id) return;

    // ── Step 3: submit ─────────────────────────────────────────────────────
    guard({ stage: "submitting" });

    let signature: string;
    try {
      const submitted = await submitSwapTx(signedBase64);
      signature = submitted.signature;

      if (submitted.confirmed) {
        // Candy Shop confirmed it inline — we're done
        guard({ stage: "confirmed", signature });
        return;
      }
    } catch (err: unknown) {
      guard({ stage: "error", error: err instanceof Error ? err.message : "Submission failed" });
      return;
    }

    if (execId.current !== id) return;

    // ── Step 4: poll confirmation ──────────────────────────────────────────
    guard({ stage: "pending", signature });

    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS));
      if (execId.current !== id) return;

      try {
        const { confirmed, error } = await fetchSwapConfirm(signature);

        if (confirmed) {
          guard({ stage: "confirmed" });
          return;
        }
        if (error) {
          guard({ stage: "error", error: `Transaction failed on-chain: ${error}` });
          return;
        }
      } catch {
        // Transient poll failure — keep trying until timeout
      }
    }

    // Timed out — tx may still land, link them to the explorer
    guard({
      stage: "error",
      error: "Confirmation timed out. The transaction may still confirm — check the explorer.",
    });
  }, [publicKey, signTransaction, state.multiRoute, connection, set]);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    ++execId.current; // invalidate any in-flight exec
    setState(INITIAL);
  }, []);

  return { ...state, getQuote, openConfirm, cancelConfirm, execute, reset };
}
