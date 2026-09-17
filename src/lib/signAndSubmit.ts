/**
 * signAndSubmit — sign + submit + poll utility.
 * Extracted from useSwap so it can be reused by useSend and other tx flows.
 * Signing is always client-side; the server never holds a private key.
 */

import { Connection, VersionedTransaction, Transaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { submitSwapTx, fetchSwapConfirm } from "../api/cookieMcp";

/** Poll every 2.5 s — fast enough to feel responsive, slow enough not to hammer the endpoint */
const POLL_MS = 2_500;
/** Abandon after 90 s and tell the user to check the explorer */
const TIMEOUT_MS = 90_000;

export type SendStage =
  | "idle"
  | "signing"
  | "submitting"
  | "pending"
  | "confirmed"
  | "error";

export interface SignAndSubmitResult {
  signature: string;
}

/**
 * Signs and submits a base64-encoded unsigned transaction.
 * Tries signTransaction (Path A: sign then submit via proxy) first;
 * falls back to sendTransaction (Path B: sign+send combined) if unavailable.
 * Polls /api/swap/confirm until confirmed, failed, or the 90 s timeout.
 * Throws a human-readable Error on any failure including wallet rejection.
 */
export async function signAndSubmit(
  txBase64: string,
  wallet: WalletContextState,
  connection: Connection,
  onStage?: (stage: SendStage) => void,
  signal?: { cancelled: boolean },
): Promise<SignAndSubmitResult> {
  const { publicKey: pk, signTransaction, sendTransaction } = wallet;

  const notify = (s: SendStage) => onStage?.(s);
  const cancelled = () => signal?.cancelled ?? false;

  if (!pk) throw new Error("Wallet not connected");

  const hasSendTx = typeof sendTransaction === "function";
  const hasSignTx = typeof signTransaction === "function";

  if (!hasSignTx && !hasSendTx) {
    throw new Error("Wallet does not support signing transactions");
  }

  const txBytes = Uint8Array.from(atob(txBase64), (c) => c.charCodeAt(0));

  notify("signing");
  let signedBase64: string | null = null;
  let inlineSignature: string | null = null;

  // Path A: signTransaction — sign client-side, submit via proxy.
  // The server never sees or holds the private key.
  if (hasSignTx && signTransaction) {
    try {
      let signed: VersionedTransaction | Transaction;
      try {
        const vt = VersionedTransaction.deserialize(txBytes);
        signed = await signTransaction(vt as Parameters<typeof signTransaction>[0]);
      } catch {
        // Legacy Transaction fallback
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
      throw new Error(isRejection ? "Transaction rejected in wallet" : `Signing failed: ${msg}`);
    }
  }
  // Path B: sendTransaction — sign and submit in one step (Nightly fallback).
  else if (hasSendTx && sendTransaction) {
    notify("submitting");
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
      inlineSignature = await sendTransaction(
        tx as Parameters<typeof sendTransaction>[0],
        connection,
      );
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err)).trim() || "Unknown error";
      const isRejection =
        msg.toLowerCase().includes("reject") ||
        msg.toLowerCase().includes("cancel") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("user rejected");
      throw new Error(isRejection ? "Transaction rejected in wallet" : `Sign & send failed: ${msg}`);
    }
  }

  if (cancelled()) throw new Error("Cancelled");

  let signature: string;

  if (inlineSignature) {
    signature = inlineSignature;
    notify("pending");
  } else if (signedBase64) {
    notify("submitting");
    let submitted: Awaited<ReturnType<typeof submitSwapTx>>;
    try {
      submitted = await submitSwapTx(signedBase64);
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Submission failed");
    }
    signature = submitted.signature;
    if (submitted.confirmed) {
      notify("confirmed");
      return { signature };
    }
    notify("pending");
  } else {
    throw new Error("No signed transaction to submit");
  }

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise<void>((r) => setTimeout(r, POLL_MS));
    if (cancelled()) throw new Error("Cancelled");

    try {
      const { confirmed, error } = await fetchSwapConfirm(signature);
      if (confirmed) {
        notify("confirmed");
        return { signature };
      }
      if (error) throw new Error(`Transaction failed on-chain: ${error}`);
    } catch (e) {
      // Re-throw only real failures, not transient poll errors
      if (e instanceof Error && e.message.startsWith("Transaction failed")) throw e;
    }
  }

  throw new Error(
    "Confirmation timed out. The transaction may still confirm — check the explorer.",
  );
}
