import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AppShell } from "./AppShell";
import ogBanner from "../assets/og-banner.png";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { publicKey, connected } = useWallet();
  if (connected && publicKey) return <AppShell walletAddress={publicKey.toBase58()} />;
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandCookie} aria-hidden="true">🍪</span>
          <span className={styles.brandName}>Cookie Chain</span>
        </div>
        <WalletMultiButton />
      </header>
      <main className={styles.main}>
        <div className={styles.empty}>
          <div className={styles.bannerWrap} role="img" aria-label="Cookie Chain Swap banner">
            <img src={ogBanner} alt="" className={styles.bannerImg} draggable={false} />
            <div className={styles.bannerOverlay}>
              <span className={styles.bannerTitle}>Cookie Chain</span>
              <span className={styles.bannerSub}>Swap</span>
            </div>
          </div>
          <div className={styles.emptyInner}>
            <h2 className={styles.emptyHeading}>Your jar awaits.</h2>
            <p className={styles.emptyBody}>Connect your Nightly wallet to see your COOK balance and start swapping.</p>
            <WalletMultiButton />
          </div>
        </div>
      </main>
    </div>
  );
}
