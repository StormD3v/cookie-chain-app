import type { UseSwapResult } from "../hooks/useSwap";
import { SwapPanel } from "./SwapPanel";
import styles from "./SectionWrapper.module.css";

interface Props {
  swap: UseSwapResult;
}

export function BakeSection({ swap }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h1 className={styles.sectionTitle}>Bake a Swap</h1>
        <p className={styles.sectionSubtitle}>Trade tokens on Cookie Chain</p>
      </div>
      {/* SwapPanel internals untouched — only repositioned */}
      <div className={styles.swapWrap}>
        <SwapPanel swap={swap} />
      </div>
    </div>
  );
}
