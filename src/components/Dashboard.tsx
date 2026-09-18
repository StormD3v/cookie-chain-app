import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AppShell } from "./AppShell";
import { WalletButton } from "./WalletButton";
import { NightlyMobileButton } from "./NightlyMobileButton";
import { isMobileBrowser } from "../lib/isMobile";
import ogBanner from "../assets/og-banner.jpg";
import styles from "./Dashboard.module.css";

export function Dashboard() {
  const { publicKey, connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  // Auto-open the picker when running inside a wallet's in-app browser.
  // Condition: mobile UA (not a desktop browser) AND at least one wallet is
  // already injected (Nightly's browser injects its wallet on load).
  // This fires once on mount; if the user dismisses, it won't re-fire.
  // Normal desktop/mobile Chrome visits are unaffected: desktop fails
  // isMobileBrowser(), and mobile Chrome with no wallet fails wallets.length>0.
  useEffect(() => {
    if (!connected && isMobileBrowser() && wallets.length > 0) {
      // Small delay so the page renders before the modal opens —
      // avoids a flash of the modal appearing before the layout settles.
      const id = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty: run once on mount only

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
