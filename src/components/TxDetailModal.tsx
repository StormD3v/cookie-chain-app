import { useEffect, useRef } from "react";
import type { ActivityItem } from "../types/cookie";
import styles from "./TxDetailModal.module.css";

const EXPLORER = "https://cookiescan.io";

interface Props {
  tx: ActivityItem | null;
  onClose: () => void;
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function TxDetailModal({ tx, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (tx && !el.open) el.showModal();
    if (!tx && el.open) el.close();
  }, [tx]);

  // Close on backdrop click
  function handleClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  if (!tx) return null;

  const explorerHref = `${EXPLORER}/tx/${tx.signature}`;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleClick}
      aria-labelledby="txdetail-title"
      aria-modal="true"
    >
      <div className={styles.sheet}>
        {/* ── Handle ─────────────────────────────────────── */}
        <div className={styles.handle} aria-hidden="true" />

        {/* ── Header ─────────────────────────────────────── */}
        <div className={styles.header}>
          <h2 id="txdetail-title" className={styles.title}>
            {tx.description}
          </h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* ── Amount hero ────────────────────────────────── */}
        {tx.amount && (
          <p className={styles.amountHero}>{tx.amount}</p>
        )}

        {/* ── Detail rows ────────────────────────────────── */}
        <dl className={styles.details}>
          <div className={styles.detailRow}>
            <dt>Status</dt>
            <dd>
              <span className={tx.status === "confirmed" ? styles.statusOk : styles.statusFail}>
                {tx.status === "confirmed" ? "✓ Confirmed" : "✗ Failed"}
              </span>
            </dd>
          </div>

          {tx.blockTime && (
            <div className={styles.detailRow}>
              <dt>Date</dt>
              <dd>{formatDate(tx.blockTime)}</dd>
            </div>
          )}

          <div className={styles.detailRow}>
            <dt>Slot</dt>
            <dd className={styles.mono}>{tx.slot.toLocaleString()}</dd>
          </div>

          <div className={styles.detailRow}>
            <dt>Signature</dt>
            <dd className={styles.mono} title={tx.signature}>
              {tx.signature.slice(0, 12)}…{tx.signature.slice(-6)}
            </dd>
          </div>
        </dl>

        {/* ── Explorer button ─────────────────────────────── */}
        <a
          className={styles.explorerBtn}
          href={explorerHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Cookiescan
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ marginLeft: "0.375rem" }}>
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H5M9.5 2.5V7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </dialog>
  );
}
