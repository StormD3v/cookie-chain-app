import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { AppShell } from "./AppShell";
import { WalletButton } from "./WalletButton";
import { NightlyMobileButton } from "./NightlyMobileButton";
import { isMobileBrowser } from "../lib/isMobile";
import cookieJarHug from "../assets/cookie-jar-hug.webp";
import styles from "./Dashboard.module.css";

// ── External links ─────────────────────────────────────────────────────────
const DOCS_URL = "https://docs.cookiechain.wtf";
const POOLS_URL = "https://cookiebox.app";

export function Dashboard() {
  const { publicKey, connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  // Auto-open the picker when running inside a wallet's in-app browser.
  useEffect(() => {
    if (!connected && isMobileBrowser() && wallets.length > 0) {
      const id = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (connected && publicKey) return <AppShell walletAddress={publicKey.toBase58()} />;

  const mobile = isMobileBrowser();

  return (
    <div className={styles.root}>

      {/* ── Nav bar ───────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandCookie} aria-hidden="true">🍪</span>
          <span className={styles.brandName}>Cookie Chain</span>
        </div>

        <nav className={styles.navLinks} aria-label="Site navigation">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
          >
            Docs
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={styles.navLinkExtIcon}>
              <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          <a
            href={POOLS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
            title="Cookiebox — Cookie Chain's liquidity layer (opens in new tab)"
          >
            Pools
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={styles.navLinkExtIcon}>
              <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </nav>

        <WalletButton />
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <main className={styles.hero}>

        {/* Mascot — transparent WebP, no UI baked in */}
        <img
          src={cookieJarHug}
          alt=""
          aria-hidden="true"
          className={styles.heroMascot}
          draggable={false}
        />

        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>Cookie Chain</p>
          <h1 className={styles.heroHeading}>
            Fresh swaps,{" "}
            <span className={styles.heroHeadingAccent}>straight from the oven.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Swap COOK and Cookie Chain tokens. Fast, cheap, culture-native.
          </p>

          <div className={styles.heroCta}>
            <WalletButton />
            {mobile && <NightlyMobileButton />}
            <p className={styles.heroNote}>
              {mobile
                ? "On mobile, open via Nightly's DApp browser to connect Nightly."
                : "Supports Nightly, Trust Wallet, Phantom and all Wallet Standard extensions."}
            </p>
          </div>
        </div>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          Docs
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a href={POOLS_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          Pools (Cookiebox)
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a href="https://cookiescan.io" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
          Explorer
        </a>
      </footer>

    </div>
  );
}
