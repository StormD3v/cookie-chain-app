import { TokenBalances } from "./TokenBalances";
import styles from "./SectionWrapper.module.css";

interface Props {
  walletAddress: string;
}

export function PantrySection({ walletAddress }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h1 className={styles.sectionTitle}>Pantry</h1>
        <p className={styles.sectionSubtitle}>All your tokens in one place</p>
      </div>
      <TokenBalances walletAddress={walletAddress} />
    </div>
  );
}
