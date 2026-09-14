import { useTokenBalances } from "../hooks/useTokenBalances";
import { BalanceCarousel } from "./BalanceCarousel";
import styles from "./TokenBalances.module.css";

interface Props {
  walletAddress: string;
}

// ── Skeleton — single card placeholder while loading ─────────────────────────

function BalanceCardSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonRow}>
        <span className={`skeleton ${styles.skeletonLabel}`} />
        <span className={`skeleton ${styles.skeletonPill}`} />
      </div>
      <span className={`skeleton ${styles.skeletonAmount}`} />
      <span className={`skeleton ${styles.skeletonUsd}`} />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TokenBalances({ walletAddress }: Props) {
  const { balances, loading, error, refetch } = useTokenBalances(walletAddress);

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.wrap} role="status" aria-label="Loading balances">
        <div className={styles.headRow}>
          <h2 className={styles.heading}>Your jar</h2>
        </div>
        <BalanceCardSkeleton />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────
  if (error) {
    return (
      <div className={styles.state} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">😬</span>
        <p className={styles.errorTitle}>Crumbs. Something went wrong.</p>
        <p className={styles.errorDetail}>{error}</p>
        <button className={styles.retryBtn} onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────
  if (balances.length === 0) {
    return (
      <div className={styles.state}>
        <span className={styles.stateIcon} aria-hidden="true">🫙</span>
        <p className={styles.stateText}>Cookie jar is empty.</p>
        <p className={styles.stateSubtext}>
          Bridge some COOK from Solana to get started.
        </p>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <div className={styles.headRow}>
        {/* Task 6: jar SVG icon replacing the bare ↻ */}
        <h2 className={styles.heading}>Your jar</h2>
        <button
          className={styles.refreshBtn}
          onClick={refetch}
          aria-label="Refresh balances"
          title="Refresh"
        >
          {/* Cookie-jar icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M3 6h10M3 6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1M3 6v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
            />
            <path d="M6 3V2.5a2 2 0 0 1 4 0V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="8" cy="9.5" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Horizontal carousel with dot indicators */}
      <BalanceCarousel balances={balances} />
    </div>
  );
}
