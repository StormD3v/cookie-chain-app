import type { SwapStage } from "../types/cookie";
import { ActivityFeed } from "./ActivityFeed";
import styles from "./SectionWrapper.module.css";

interface Props {
  walletAddress: string;
  swapStage: SwapStage;
}

export function CrumbsSection({ walletAddress, swapStage }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h1 className={styles.sectionTitle}>Crumbs</h1>
        <p className={styles.sectionSubtitle}>Your recent transactions</p>
      </div>
      <ActivityFeed walletAddress={walletAddress} swapStage={swapStage} />
    </div>
  );
}
