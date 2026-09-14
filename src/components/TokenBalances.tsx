import { useTokenBalances } from "../hooks/useTokenBalances";
import { BalanceCard } from "./BalanceCard";
import styles from "./TokenBalances.module.css";

interface Props {
  walletAddress: string;
}

// ── BalanceCard skeleton — mirrors the real card's three-row layout ────────

function BalanceCardSkeleton() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      {/* Symbol/badge row */}
      <div className={styles.skeletonRow}>
        <span className={`skeleton ${styles.skeletonLabel}`} />
        <span className={`skeleton ${styles.skeletonPill}`} />
      </div>
      {/* Amount — dominant block */}
      <span className={`skeleton ${styles.skeletonAmount}`} />
      {/* USD value */}
      <span className={`skeleton ${styles.skeletonUsd}`} />
    </div>
  );
}

export function TokenBalances({ walletAddress }: Props) {
  const { balances, loading, error, refetch } = useTokenBalances(walletAddress);

  if (loading) {
    return (
      <div className={styles.wrap} role="status" aria-label="Loading balances">
        <div className={styles.headRow}>
          <h2 className={styles.heading}>Your jar</h2>
        </div>
        <ul className={styles.grid} role="list">
          <li><BalanceCardSkeleton /></li>
        </ul>
      </div>
    );
  }

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

  return (
    <div className={styles.wrap}>
      <div className={styles.headRow}>
        <h2 className={styles.heading}>Your jar</h2>
        <button
          className={styles.refreshBtn}
          onClick={refetch}
          aria-label="Refresh balances"
          title="Refresh"
        >
          ↻
        </button>
      </div>
      <ul className={styles.grid} role="list">
        {balances.map((token) => (
          <li key={token.mint}>
            <BalanceCard token={token} />
          </li>
        ))}
      </ul>
    </div>
  );
}
