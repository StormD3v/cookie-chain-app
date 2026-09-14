import { useEffect } from "react";
import type { SwapStage } from "../types/cookie";
import { useActivity } from "../hooks/useActivity";
import styles from "./ActivityFeed.module.css";

const EXPLORER = "https://explorer.cookiescan.io";

// ── Inline SVG icons — no library dependency ──────────────────────────────

/** Swap icon: two arrows crossing */
const SwapIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 4.5h9M8.5 2l2.5 2.5L8.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 8.5H2M4.5 6l-2.5 2.5L4.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Sent / outbound: arrow up-right */
const SentIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M3 10L10 3M10 3H5M10 3v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Received / inbound: arrow down-left */
const ReceivedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M10 3L3 10M3 10h5M3 10V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Generic transaction: circle with dot */
const TxIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" />
  </svg>
);

/** Bridge: two blocks with arrow */
const BridgeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="3.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8.5" y="5.5" width="3.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.5 5.75h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M7 4.25l1.5 1.5L7 7.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type TxIconKind = "swap" | "sent" | "received" | "bridge" | "tx";

function classifyTx(description: string): TxIconKind {
  const d = description.toLowerCase();
  if (d.includes("swap") || d.includes("exchange") || d.includes("route")) return "swap";
  if (d.includes("bridge")) return "bridge";
  if (d.includes("transfer") || d.includes("sent") || d.includes("send")) return "sent";
  if (d.includes("received") || d.includes("receive")) return "received";
  return "tx";
}

function TxKindIcon({ kind }: { kind: TxIconKind }) {
  switch (kind) {
    case "swap": return <SwapIcon />;
    case "sent": return <SentIcon />;
    case "received": return <ReceivedIcon />;
    case "bridge": return <BridgeIcon />;
    default: return <TxIcon />;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  walletAddress: string;
  swapStage: SwapStage;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActivityFeed({ walletAddress, swapStage }: Props) {
  const { transactions, loading, error, refetch } = useActivity(walletAddress);

  useEffect(() => {
    if (swapStage === "confirmed") {
      const id = setTimeout(() => refetch(), 2500);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [swapStage, refetch]);

  return (
    <div className={styles.feed}>
      <div className={styles.headRow}>
        <h2 className={styles.heading}>Crumbs</h2>
        <button
          className={styles.refreshBtn}
          onClick={refetch}
          aria-label="Refresh activity"
          title="Refresh"
          disabled={loading}
        >
          ↻
        </button>
      </div>

      {loading && (
        <ol className={styles.list} aria-label="Loading activity" role="status">
          {[0, 1, 2].map((i) => (
            <li key={i} className={styles.row} aria-hidden="true">
              {/* Icon circle */}
              <span className={`skeleton ${styles.skelIcon}`} />
              {/* Description + timestamp body */}
              <div className={styles.rowBody}>
                <span className={`skeleton ${styles.skelDesc}`} />
                <span className={`skeleton ${styles.skelTime}`} />
              </div>
              {/* Badge */}
              <span className={`skeleton ${styles.skelBadge}`} />
              {/* Link */}
              <span className={`skeleton ${styles.skelLink}`} />
            </li>
          ))}
        </ol>
      )}

      {!loading && error && (
        <div className={styles.state} role="alert">
          <p className={styles.errorMsg}>{error}</p>
          <button className={styles.retryBtn} onClick={refetch}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && transactions.length === 0 && (
        <div className={styles.state}>
          <span className={styles.emptyIcon} aria-hidden="true">🍪</span>
          <p className={styles.stateText}>No crumbs yet.</p>
        </div>
      )}

      {!loading && !error && transactions.length > 0 && (
        <ol className={styles.list} aria-label="Recent transactions">
          {transactions.map((tx) => {
            const kind = classifyTx(tx.description);
            return (
              <li key={tx.signature} className={styles.row}>
                {/* Directional icon — replaces the plain coloured dot */}
                <span
                  className={`${styles.iconWrap} ${tx.status === "failed" ? styles.iconFailed : styles.iconOk}`}
                  aria-label={tx.status}
                >
                  <TxKindIcon kind={kind} />
                </span>

                {/* Description + time */}
                <div className={styles.rowBody}>
                  <span className={styles.desc}>{tx.description}</span>
                  <span className={styles.time}>
                    {tx.blockTime ? relativeTime(tx.blockTime) : `slot ${tx.slot}`}
                  </span>
                </div>

                {/* Status badge */}
                <span
                  className={`${styles.badge} ${tx.status === "failed" ? styles.badgeFailed : styles.badgeOk}`}
                >
                  {tx.status}
                </span>

                {/* Explorer link */}
                <a
                  className={styles.explorerLink}
                  href={`${EXPLORER}/tx/${tx.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`View transaction ${tx.signature.slice(0, 8)}… on explorer`}
                  title={tx.signature}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                    <path d="M2 9L9 2M9 2H5M9 2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
