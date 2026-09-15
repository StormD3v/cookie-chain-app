import { useEffect, useRef, useState, useCallback } from "react";
import styles from "./ReceiveModal.module.css";

interface Props {
  walletAddress: string | null;
  onClose: () => void;
}

export function ReceiveModal({ walletAddress, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open / close in sync with walletAddress presence
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (walletAddress && !el.open) el.showModal();
    if (!walletAddress && el.open) el.close();
  }, [walletAddress]);

  // Close on backdrop click
  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  const handleCopy = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable — fallback: select the text
      const input = document.getElementById("receive-address-input") as HTMLInputElement | null;
      input?.select();
    });
  }, [walletAddress]);

  // Cleanup timer on unmount
  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  if (!walletAddress) return null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleDialogClick}
      aria-labelledby="receive-title"
      aria-modal="true"
    >
      <div className={styles.sheet}>
        {/* ── Header ─────────────────────────────────────── */}
        <div className={styles.header}>
          <h2 id="receive-title" className={styles.title}>
            Receive
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Subtitle ───────────────────────────────────── */}
        <p className={styles.subtitle}>
          Share this address to receive COOK or any Cookie Chain token.
        </p>

        {/* ── Address display ────────────────────────────── */}
        <div className={styles.addressBlock}>
          <label htmlFor="receive-address-input" className={styles.addressLabel}>
            Your address
          </label>
          <div className={styles.addressRow}>
            <input
              id="receive-address-input"
              className={styles.addressInput}
              value={walletAddress}
              readOnly
              onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
              aria-label="Wallet address"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ""}`}
              onClick={handleCopy}
              aria-label={copied ? "Copied!" : "Copy address"}
              type="button"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M4.5 9.5H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5.5a1 1 0 0 1 1 1v1.5"
                      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Full address in mono for readability */}
          <p className={styles.addressFull} title={walletAddress}>
            {walletAddress}
          </p>
        </div>

        {/* ── Network note ───────────────────────────────── */}
        <div className={styles.networkNote}>
          <span className={styles.networkDot} aria-hidden="true" />
          <span>Cookie Chain only — do not send Solana assets directly</span>
        </div>
      </div>
    </dialog>
  );
}
