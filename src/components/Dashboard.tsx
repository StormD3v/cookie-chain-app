import { useWallet } from "@solana/wallet-adapter-react";
import { AppShell } from "./AppShell";
import { WalletButton } from "./WalletButton";
import { NightlyMobileButton } from "./NightlyMobileButton";
import { isMobileBrowser } from "../lib/isMobile";
import ogBanner from "../assets/og-banner.jpg";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { publicKey, connected } = useWallet();
  if (connected && publicKey) return <AppShell walletAddress={publicKey.toBase58()} />;

  const mobile = isMobileBrowser();

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandCookie} aria-hidden="true">🍪</span>
          <span className={styles.brandName}>Cookie Chain</span>
        </div>
        <WalletButton />
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
            <p className={styles.emptyBody}>
              {mobile
                ? "On mobile, tap \"Open in Nightly\" below to connect via the Nightly app."
                : "Connect your Nightly wallet to see your COOK balance and start swapping."}
            </p>
            <WalletButton />
            <NightlyMobileButton />
          </div>
        </div>
      </main>
    </div>
  );
}
