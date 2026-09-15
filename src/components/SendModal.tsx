import { useEffect, useRef, useState, useCallback } from "react";
import { useSend } from "../hooks/useSend";
import { getTokenLogo } from "../lib/tokenLogos";
import type { TokenBalance } from "../types/cookie";
import styles from "./SendModal.module.css";

const EXPLORER = "https://cookiescan.io";

const SEND_TOKENS = [
  { mint: "So11111111111111111111111111111111111111112", symbol: "COOK", decimals: 9 },
  { mint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz", symbol: "bCOOK", decimals: 9 },
  { mint: "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q", symbol: "CHAT", decimals: 6 },
] as const;

interface Props {
  balances: TokenBalance[];
  onClose: () => void;
}

// ── Inner modal — only mounted while the modal should be visible ──────────────
// Mounting/unmounting is controlled by the parent (OverviewSection renders
// <SendModal> only when showSend is true). This eliminates both bugs:
//   1. Auto-open on wallet connect: the component doesn't exist until Send is clicked
//   2. X button not closing: onClose() unmounts this component entirely — no dialog
//      state to fight with, no useEffect race

function SendModalInner({ balances, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { stage, signature, error, needsAtaCreation, ataRentCook, send, reset } = useSend();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [mint, setMint] = useState<string>(SEND_TOKENS[0].mint);

  // Open the dialog on mount — it's always supposed to be visible when this
  // component exists, so showModal() unconditionally on first render.
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []); // empty deps — runs once on mount only

  const handleClose = useCallback(() => {
    dialogRef.current?.close();
    reset();
    onClose(); // unmounts this component
  }, [reset, onClose]);

  function handleBackdrop(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) handleClose();
  }

  const selectedBalance = balances.find(b => b.mint === mint);
  const available = selectedBalance?.uiAmount ?? 0;
  const selectedToken = SEND_TOKENS.find(t => t.mint === mint)!;
  const logoSrc = getTokenLogo(mint);

  function handleMax() {
    const COOK_MINT = "So11111111111111111111111111111111111111112";
    const max = mint === COOK_MINT
      ? Math.max(0, available - 0.001)
      : available;
    setAmount(max.toLocaleString("en-US", {
      maximumFractionDigits: selectedToken.decimals,
      useGrouping: false,
    }));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await send({ recipient, mint, amount }, balances);
  }

  const isBusy = stage === "signing" || stage === "submitting" || stage === "pending";
  const isDone = stage === "confirmed";

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleBackdrop}
      aria-labelledby="send-title"
      aria-modal="true"
    >
      <div className={styles.sheet}>
        <div className={styles.header}>
          <h2 id="send-title" className={styles.title}>Send</h2>
          <button className={styles.closeBtn} onClick={handleClose} aria-label="Close" type="button">✕</button>
        </div>

        {isDone && signature ? (
          <div className={styles.confirmedWrap}>
            <p className={styles.confirmedIcon} aria-hidden="true">✓</p>
            <p className={styles.confirmedTitle}>Sent!</p>
            <p className={styles.confirmedSub}>Transaction confirmed on Cookie Chain.</p>
            <a
              className={styles.explorerBtn}
              href={`${EXPLORER}/tx/${signature}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Cookiescan
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginLeft: "0.375rem" }}>
                <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <button className={styles.doneBtn} onClick={handleClose} type="button">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSend} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="send-token">Token</label>
              <div className={styles.tokenSelectWrap}>
                {logoSrc && <img src={logoSrc} alt="" aria-hidden="true" className={styles.tokenSelectLogo} />}
                <select
                  id="send-token"
                  className={styles.tokenSelect}
                  value={mint}
                  onChange={e => { setMint(e.target.value); setAmount(""); }}
                  disabled={isBusy}
                >
                  {SEND_TOKENS.map(t => (
                    <option key={t.mint} value={t.mint}>{t.symbol}</option>
                  ))}
                </select>
              </div>
              <p className={styles.balanceHint}>
                Available:{" "}
                <button type="button" className={styles.maxBtn} onClick={handleMax} disabled={isBusy}
                  aria-label={`Set maximum ${selectedToken.symbol}`}>
                  {available.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedToken.symbol}
                </button>
              </p>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="send-recipient">Recipient address</label>
              <input
                id="send-recipient" className={styles.input} type="text"
                placeholder="Base58 address…" value={recipient}
                onChange={e => setRecipient(e.target.value)}
                disabled={isBusy} autoComplete="off" spellCheck={false}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="send-amount">Amount</label>
              <div className={styles.amountRow}>
                <input
                  id="send-amount" className={styles.input} type="number"
                  step="any" min="0" placeholder="0.00" value={amount}
                  onChange={e => setAmount(e.target.value)} disabled={isBusy}
                />
                <span className={styles.amountSymbol}>{selectedToken.symbol}</span>
              </div>
            </div>

            {needsAtaCreation && (
              <div className={styles.ataNotice} role="alert">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>
                  Recipient has no {selectedToken.symbol} account.
                  Creating it adds ~{ataRentCook.toFixed(4)} COOK rent to this transaction.
                </span>
              </div>
            )}

            {error && stage === "error" && (
              <p className={styles.errorMsg} role="alert">{error}</p>
            )}

            {isBusy && (
              <p className={styles.stageLine} aria-live="polite">
                {stage === "signing" && "Waiting for wallet signature…"}
                {stage === "submitting" && "Submitting to Cookie Chain…"}
                {stage === "pending" && "Waiting for confirmation…"}
              </p>
            )}

            <button
              type="submit"
              className={styles.sendBtn}
              disabled={isBusy || !recipient.trim() || !amount || parseFloat(amount) <= 0}
            >
              {isBusy
                ? <span className={styles.spinner} aria-hidden="true" />
                : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
              {isBusy ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}

// ── Public export — renders nothing unless showSend is true ───────────────────
export function SendModal({ balances, onClose, open }: Props & { open: boolean }) {
  if (!open) return null;
  return <SendModalInner balances={balances} onClose={onClose} />;
}
