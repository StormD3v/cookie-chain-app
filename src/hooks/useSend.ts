/**
 * useSend — hook for sending COOK (native) or SPL tokens (bCOOK, CHAT).
 *
 * Responsibilities:
 *  - Validate recipient address (PublicKey.isOnCurve)
 *  - Check sender balance per selected token
 *  - For SPL: check if recipient's ATA exists; if not, prepend
 *    createAssociatedTokenAccountInstruction (with rent cost surfaced to UI)
 *  - Build the unsigned Transaction
 *  - Sign + submit + poll via signAndSubmit()
 */

import { useState, useCallback, useRef } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { signAndSubmit, type SendStage } from "../lib/signAndSubmit";
import type { TokenBalance } from "../types/cookie";

// ── Known tokens ──────────────────────────────────────────────────────────────

const COOK_MINT = "So11111111111111111111111111111111111111112";

// mint → decimals for the three supported tokens
const MINT_DECIMALS: Record<string, number> = {
  [COOK_MINT]: 9,                                          // native COOK (lamports)
  "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": 9,     // bCOOK
  "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": 6,     // CHAT
};

// Minimum lamports kept in sender account to stay rent-exempt
const MIN_COOK_RESERVE = 0.001; // COOK

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendParams {
  recipient: string;  // base58 address
  mint: string;       // token mint address
  amount: string;     // human-readable (e.g. "10.5")
}

export interface UseSendState {
  stage: SendStage;
  signature: string | null;
  error: string | null;
  /** Set when recipient has no ATA for the selected SPL token */
  needsAtaCreation: boolean;
  /** Approximate rent cost in COOK lamports when needsAtaCreation is true */
  ataRentCook: number;
}

export interface UseSendResult extends UseSendState {
  /** Validate inputs and build + sign + submit the transaction */
  send: (params: SendParams, balances: TokenBalance[]) => Promise<void>;
  reset: () => void;
}

const INITIAL: UseSendState = {
  stage: "idle",
  signature: null,
  error: null,
  needsAtaCreation: false,
  ataRentCook: 0,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSend(): UseSendResult {
  const { connection } = useConnection();
  const wallet = useWallet();
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const [state, setState] = useState<UseSendState>(INITIAL);
  const execId = useRef(0);
  const cancelRef = useRef({ cancelled: false });

  const set = useCallback((patch: Partial<UseSendState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // ── Validation helper ─────────────────────────────────────────────────────

  function validateRecipient(addr: string): PublicKey | string {
    if (!addr.trim()) return "Recipient address is required";
    try {
      const pk = new PublicKey(addr.trim());
      if (!PublicKey.isOnCurve(pk.toBytes())) return "Invalid address — not on ed25519 curve";
      return pk;
    } catch {
      return "Invalid address";
    }
  }

  // ── ATA existence check ───────────────────────────────────────────────────

  async function checkAta(
    recipientPk: PublicKey,
    mintPk: PublicKey,
  ): Promise<{ exists: boolean; ata: PublicKey; rentLamports: number }> {
    const ata = await getAssociatedTokenAddress(
      mintPk,
      recipientPk,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );
    const info = await connection.getAccountInfo(ata);
    const rentLamports = info
      ? 0
      : await connection.getMinimumBalanceForRentExemption(165); // token account size
    return { exists: info !== null, ata, rentLamports };
  }

  // ── send ──────────────────────────────────────────────────────────────────

  const send = useCallback(async (params: SendParams, balances: TokenBalance[]) => {
    const { recipient, mint, amount } = params;
    const w = walletRef.current;
    const senderPk = w.publicKey;

    // Guard: wallet connected
    if (!senderPk) {
      set({ stage: "error", error: "Wallet not connected" });
      return;
    }

    // Guard: valid amount
    const amountFloat = parseFloat(amount);
    if (!amount || Number.isNaN(amountFloat) || amountFloat <= 0) {
      set({ stage: "error", error: "Enter a valid amount greater than zero" });
      return;
    }

    // Guard: valid recipient
    const recipientResult = validateRecipient(recipient);
    if (typeof recipientResult === "string") {
      set({ stage: "error", error: recipientResult });
      return;
    }
    const recipientPk = recipientResult;

    // Guard: not sending to self
    if (recipientPk.toBase58() === senderPk.toBase58()) {
      set({ stage: "error", error: "Cannot send to your own address" });
      return;
    }

    // Guard: balance sufficient
    const tokenBalance = balances.find(b => b.mint === mint);
    const available = tokenBalance?.uiAmount ?? 0;
    const isNative = mint === COOK_MINT;

    const effectiveMax = isNative
      ? Math.max(0, available - MIN_COOK_RESERVE)
      : available;

    if (amountFloat > effectiveMax) {
      const msg = isNative
        ? `Insufficient balance (max ${effectiveMax.toLocaleString(undefined, { maximumFractionDigits: 6 })} COOK after reserve)`
        : `Insufficient balance (available: ${available.toLocaleString(undefined, { maximumFractionDigits: 6 })})`;
      set({ stage: "error", error: msg });
      return;
    }

    const id = ++execId.current;
    cancelRef.current = { cancelled: false };

    set({ stage: "signing", error: null, needsAtaCreation: false, ataRentCook: 0, signature: null });

    try {
      const decimals = MINT_DECIMALS[mint] ?? 9;
      const mintPk = new PublicKey(mint);

      // Convert human amount to raw integer units
      const rawAmount = BigInt(Math.round(amountFloat * 10 ** decimals));

      // Build transaction
      const tx = new Transaction();
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = senderPk;

      if (execId.current !== id) return;

      if (isNative) {
        // ── Native COOK transfer ────────────────────────────────────────────
        tx.add(
          SystemProgram.transfer({
            fromPubkey: senderPk,
            toPubkey: recipientPk,
            lamports: rawAmount,
          }),
        );
      } else {
        // ── SPL token transfer (bCOOK or CHAT) ─────────────────────────────

        // Sender's ATA (must already exist — sender owns the token)
        const senderAta = await getAssociatedTokenAddress(
          mintPk,
          senderPk,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        // Check if recipient already has an ATA for this token
        const { exists: ataExists, ata: recipientAta, rentLamports } =
          await checkAta(recipientPk, mintPk);

        if (execId.current !== id) return;

        if (!ataExists) {
          // Surface rent cost to the UI before proceeding
          const rentCook = rentLamports / LAMPORTS_PER_SOL;
          if (execId.current === id) {
            setState(s => ({
              ...s,
              needsAtaCreation: true,
              ataRentCook: rentCook,
            }));
          }
          // Prepend ATA creation instruction — sender pays the rent
          tx.add(
            createAssociatedTokenAccountInstruction(
              senderPk,          // payer
              recipientAta,      // associated token account address
              recipientPk,       // owner
              mintPk,            // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID,
            ),
          );
        }

        // Transfer instruction
        tx.add(
          createTransferCheckedInstruction(
            senderAta,      // source
            mintPk,         // mint
            recipientAta,   // destination
            senderPk,       // owner of source
            rawAmount,      // amount in raw units
            decimals,       // decimals
            [],             // multisig signers
            TOKEN_PROGRAM_ID,
          ),
        );
      }

      // Serialise to base64 for signAndSubmit
      const txBytes = tx.serialize({ requireAllSignatures: false });
      const txBase64 = btoa(String.fromCharCode(...txBytes));

      if (execId.current !== id) return;

      // Sign → submit → poll
      const { signature } = await signAndSubmit(
        txBase64,
        w,
        connection,
        (stage) => {
          if (execId.current === id) setState(s => ({ ...s, stage }));
        },
        cancelRef.current,
      );

      if (execId.current === id) {
        setState(s => ({ ...s, stage: "confirmed", signature }));
      }
    } catch (err: unknown) {
      if (execId.current !== id) return;
      set({ stage: "error", error: err instanceof Error ? err.message : "Transaction failed" });
    }
  }, [connection, set]);

  // ── reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    ++execId.current;
    cancelRef.current.cancelled = true;
    setState(INITIAL);
  }, []);

  return { ...state, send, reset };
}
