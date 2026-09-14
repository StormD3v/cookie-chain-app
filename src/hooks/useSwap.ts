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
    // Read wallet state at call time, not from closure
    const { publicKey: pk, signTransaction, sendTransaction } = walletRef.current;

    if (!pk) {
      set({ stage: "error", error: "Wallet not connected" });
      return;
    }

    // Nightly's adapter declares signTransaction — but guard defensively
    // and log what's actually available for debugging.
    const hasSendTx = typeof sendTransaction === "function";
    const hasSignTx = typeof signTransaction === "function";

    console.log("[swap] wallet methods available:", {
      signTransaction: hasSignTx,
      sendTransaction: hasSendTx,
    });

    if (!hasSignTx && !hasSendTx) {
      set({ stage: "error", error: "Wallet does not support signing transactions" });
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
        userPublicKey: pk.toBase58(),
      });
      txBase64 = built.transactionBase64;
    } catch (err: unknown) {
      guard({ stage: "error", error: err instanceof Error ? err.message : "Failed to build transaction" });
      return;
    }

    if (execId.current !== id) return;

    // ── Step 2: sign with Nightly ─────────────────────────────────────────
    // Nightly's adapter declares signTransaction; we use it when available.
    // If only sendTransaction is present (sign+send combined), we take that
    // path and collapse signing+submitting into one step.
    let signedBase64: string | null = null;
    let inlineSignature: string | null = null;

    const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));

    if (hasSignTx && signTransaction) {
      // Preferred path: sign only, then submit via our proxy
      try {
        let signed: VersionedTransaction | Transaction;
        try {
          const vt = VersionedTransaction.deserialize(txBytes);
          signed = await signTransaction(vt as Parameters<typeof signTransaction>[0]);
        } catch {
          // Fall back to legacy Transaction
          const lt = Transaction.from(txBytes);
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");
          lt.recentBlockhash = blockhash;
          lt.lastValidBlockHeight = lastValidBlockHeight;
          signed = await signTransaction(lt as Parameters<typeof signTransaction>[0]);
        }
        const serialised = signed.serialize();
        signedBase64 = btoa(String.fromCharCode(...serialised));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Signing failed";
        const isRejection =
          msg.toLowerCase().includes("reject") ||
          msg.toLowerCase().includes("cancel") ||
          msg.toLowerCase().includes("denied") ||
          msg.toLowerCase().includes("user rejected");
        guard({
          stage: "error",
          error: isRejection ? "Transaction rejected in wallet" : `Signing failed: ${msg}`,
        });
        return;
      }
    } else if (hasSendTx && sendTransaction) {
      // Fallback path: sign+send combined via wallet adapter directly to chain.
      // We skip our proxy submit step and poll confirmation via the proxy instead.
      guard({ stage: "submitting" });
      try {
        let tx: VersionedTransaction | Transaction;
        try {
          tx = VersionedTransaction.deserialize(txBytes);
        } catch {
          tx = Transaction.from(txBytes);
          const { blockhash, lastValidBlockHeight } =
            await connection.getLatestBlockhash("confirmed");
          (tx as Transaction).recentBlockhash = blockhash;
          (tx as Transaction).lastValidBlockHeight = lastValidBlockHeight;
        }
        inlineSignature = await sendTransaction(tx as Parameters<typeof sendTransaction>[0], connection);
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : String(err)).trim() || "Unknown error — please try again";
        const isRejection =
          msg.toLowerCase().includes("reject") ||
          msg.toLowerCase().includes("cancel") ||
          msg.toLowerCase().includes("denied") ||
          msg.toLowerCase().includes("user rejected");
        guard({
          stage: "error",
          error: isRejection ? "Transaction rejected in wallet" : `Sign & send failed: ${msg}`,
        });
        return;
      }
    }

    if (execId.current !== id) return;

    // ── Step 3: submit (only if we signed separately; sendTransaction path skips this) ──
    let signature: string;

    if (inlineSignature) {
      // sendTransaction path — already submitted, go straight to polling
      signature = inlineSignature;
      guard({ stage: "pending", signature });
    } else if (signedBase64) {
      guard({ stage: "submitting" });
      try {
        const submitted = await submitSwapTx(signedBase64);
        signature = submitted.signature;
        if (submitted.confirmed) {
          guard({ stage: "confirmed", signature });
          return;
        }
      } catch (err: unknown) {
        guard({ stage: "error", error: err instanceof Error ? err.message : "Submission failed" });
        return;
      }
      if (execId.current !== id) return;
      guard({ stage: "pending", signature });
    } else {
      guard({ stage: "error", error: "No signed transaction to submit" });
      return;
    }

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
  }, [state.multiRoute, connection, set]);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    ++execId.current; // invalidate any in-flight exec
    setState(INITIAL);
  }, []);

  return { ...state, getQuote, openConfirm, cancelConfirm, execute, reset };
}
