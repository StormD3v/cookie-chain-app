import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useSwap } from "../hooks/useSwap";
import { TokenBalances } from "./TokenBalances";
import { SwapPanel } from "./SwapPanel";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { ActivityFeed } from "./ActivityFeed";
import ogBanner from "../assets/og-banner.png";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { publicKey, connected } = useWallet();
  const swap = useSwap();

  return (
    <div className={styles.root}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandCookie} aria-hidden="true">🍪</span>
          <span className={styles.brandName}>Cookie Chain</span>
        </div>
        <WalletMultiButton />
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <main className={styles.main}>
        {connected && publicKey ? (
          <div className={styles.grid}>
            {/* Left — balances */}
            <section aria-label="Token balances">
              <TokenBalances walletAddress={publicKey.toBase58()} />
            </section>

            {/* Right — swap hero */}
            <section aria-label="Swap">
              <SwapPanel swap={swap} />
            </section>

            {/* Full-width — activity feed */}
            <section className={styles.feedRow} aria-label="Recent activity">
              <ActivityFeed
                walletAddress={publicKey.toBase58()}
                swapStage={swap.stage}
              />
            </section>
          </div>
        ) : (
          <div className={styles.empty}>
            {/* Banner with text overlay — negative space on the right */}
            <div className={styles.bannerWrap} role="img" aria-label="Cookie Chain Swap banner">
              <img
                src={ogBanner}
                alt=""
                className={styles.bannerImg}
                draggable={false}
              />
              <div className={styles.bannerOverlay}>
                <span className={styles.bannerTitle}>Cookie Chain</span>
                <span className={styles.bannerSub}>Swap</span>
              </div>
            </div>

            <div className={styles.emptyInner}>
              <h2 className={styles.emptyHeading}>Your jar awaits.</h2>
              <p className={styles.emptyBody}>
                Connect your Nightly wallet to see your COOK balance and start swapping.
              </p>
              <WalletMultiButton />
            </div>
          </div>
        )}
      </main>

      {/* Modal rendered outside the grid so <dialog> stacks correctly */}
      <SwapConfirmModal swap={swap} />
    </div>
  );
}
