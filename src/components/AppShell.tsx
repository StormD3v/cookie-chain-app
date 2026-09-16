import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useSwap } from "../hooks/useSwap";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { OverviewSection } from "./OverviewSection";
import { PantrySection } from "./PantrySection";
import { BakeSection } from "./BakeSection";
import { CrumbsSection } from "./CrumbsSection";
import sidebarCookieCluster from "../assets/sidebar-cookie-cluster.png";
import styles from "./AppShell.module.css";

// ── Hyperlane bridge URL ──────────────────────────────────────────────────────
// Same external handoff as before — no in-app bridge page
const BRIDGE_URL = "https://hyperlane.cookiescan.io";

// ── Section types ─────────────────────────────────────────────────────────────
type Section = "overview" | "pantry" | "bake" | "crumbs";

// ── Nav item SVGs ─────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 6.5L8 2l6 4.5V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6.5Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 15V9h4v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PantryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="3.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M5 1.5v2M8 1.5v2M11 1.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const BakeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2C5.24 2 3 4.24 3 7c0 1.8.94 3.38 2.36 4.3L4.5 14h7l-.86-2.7C12.06 10.38 13 8.8 13 7c0-2.76-2.24-5-5-5Z"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 14h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const BridgeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1 11c0-3.31 2.69-6 6-6 1.66 0 3.16.67 4.24 1.76"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M15 11c0-3.31-2.69-6-6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M1 11h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M4 11v2M8 11v2M12 11v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const CrumbsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  walletAddress: string;
}

export function AppShell({ walletAddress }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [networkOpen, setNetworkOpen] = useState(false);
  const networkRef = useRef<HTMLDivElement>(null);
  const { connected } = useWallet();
  const swap = useSwap();

  // Close network dropdown on outside click
  useEffect(() => {
    if (!networkOpen) return;
    function handleOutside(e: MouseEvent) {
      if (networkRef.current && !networkRef.current.contains(e.target as Node)) {
        setNetworkOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [networkOpen]);

  function handleBridge() {
    window.open(BRIDGE_URL, "_blank", "noopener,noreferrer");
  }

  const mainNavItems: { id: Section | "bridge"; label: string; Icon: () => JSX.Element; bridge?: boolean }[] = [
    { id: "overview", label: "Overview", Icon: HomeIcon },
    { id: "pantry", label: "Pantry", Icon: PantryIcon },
    { id: "bake", label: "Bake", Icon: BakeIcon },
    { id: "bridge", label: "Bridge", Icon: BridgeIcon, bridge: true },
    { id: "crumbs", label: "Crumbs", Icon: CrumbsIcon },
  ];

  function renderSection() {
    switch (section) {
      case "pantry": return <PantrySection walletAddress={walletAddress} />;
      case "bake": return <BakeSection swap={swap} />;
      case "crumbs": return <CrumbsSection walletAddress={walletAddress} swapStage={swap.stage} />;
      default: return <OverviewSection walletAddress={walletAddress} swap={swap} onNavigate={setSection} />;
    }
  }

  return (
    <div className={styles.shell}>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        {/* Brand */}
        <div className={styles.sidebarBrand}>
          <span className={styles.sidebarLogo} aria-hidden="true">🍪</span>
          <div className={styles.sidebarBrandText}>
            <span className={styles.sidebarBrandName}>Cookie Chain</span>
            <span className={styles.sidebarBrandTag}>Your on-chain kitchen.</span>
          </div>
        </div>

        {/* Nav section: MAIN */}
        <nav className={styles.sidebarNav}>
          <p className={styles.navLabel}>Main</p>
          {mainNavItems.map(({ id, label, Icon, bridge }) => (
            <button
              key={id}
              className={`${styles.navItem} ${!bridge && section === id ? styles.navItemActive : ""}`}
              onClick={() => bridge ? handleBridge() : setSection(id as Section)}
              aria-current={!bridge && section === id ? "page" : undefined}
            >
              <span className={styles.navIcon}><Icon /></span>
              <span className={styles.navLabel2}>{label}</span>
              {bridge && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={styles.navExternal}>
                  <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}

          {/* Extra items (desktop only) */}
          <div className={styles.navSpacer} />
          <p className={styles.navLabel}>Extras</p>
          <a
            href="https://cookiescan.io"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navItem}
          >
            <span className={styles.navIcon}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
                <path d="M5.5 8h5M8 5.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className={styles.navLabel2}>Explore</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={styles.navExternal}>
              <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </nav>

        {/* Cookie cluster decoration — real asset, anchored to bottom-left corner */}
        <img
          src={sidebarCookieCluster}
          alt=""
          aria-hidden="true"
          className={styles.sidebarCookieCluster}
        />

        {/* Chain status footer */}
        <div className={styles.sidebarFooter}>
          <span className={styles.chainDot} aria-hidden="true" />
          <div className={styles.chainInfo}>
            <span className={styles.chainName}>Cookie Chain</span>
            <span className={styles.chainStatus}>Healthy</span>
          </div>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────────── */}
      <div className={styles.body}>
        {/* Top header bar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {/* Mobile brand */}
            <span className={styles.mobileBrand} aria-hidden="true">🍪</span>
            <span className={styles.mobileBrandName}>Cookie Chain</span>
          </div>
          <div className={styles.topbarRight}>
            {/* Network selector — visual placeholder, no switching logic */}
            <div className={styles.networkSelector} ref={networkRef}>
              <button
                className={`${styles.chainPill} ${networkOpen ? styles.chainPillOpen : ""}`}
                onClick={() => setNetworkOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={networkOpen}
                aria-label="Network selector"
              >
                <span className={styles.chainDotSm} aria-hidden="true" />
                <span className={styles.chainPillText}>Cookie Chain</span>
                <svg
                  className={`${styles.chainChevron} ${networkOpen ? styles.chainChevronOpen : ""}`}
                  width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                >
                  <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {networkOpen && (
                <div className={styles.networkDropdown} role="listbox" aria-label="Select network">
                  {/* Active network */}
                  <div className={styles.networkItem} role="option" aria-selected="true">
                    <span className={styles.chainDotSm} aria-hidden="true" />
                    <span className={styles.networkItemName}>Cookie Chain</span>
                    <svg className={styles.networkCheck} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className={styles.networkDivider} aria-hidden="true" />

                  {/* Placeholder — no switching logic */}
                  <div className={styles.networkComingSoon}>
                    More networks coming soon
                  </div>
                </div>
              )}
            </div>

            {connected && <WalletMultiButton />}
          </div>
        </header>

        {/* Section content */}
        <main className={styles.content}>
          {renderSection()}
        </main>
      </div>

      {/* ── Mobile bottom tab bar ───────────────────────────────── */}
      <nav className={styles.bottomBar} aria-label="Bottom navigation">
        {mainNavItems.map(({ id, label, Icon, bridge }) => (
          <button
            key={id}
            className={`${styles.tabBtn} ${!bridge && section === id ? styles.tabBtnActive : ""}`}
            onClick={() => bridge ? handleBridge() : setSection(id as Section)}
            aria-current={!bridge && section === id ? "page" : undefined}
          >
            <span className={styles.tabIcon}><Icon /></span>
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}
      </nav>

      {/* Swap confirm modal — always mounted above everything */}
      <SwapConfirmModal swap={swap} />
    </div>
  );
}
