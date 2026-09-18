import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useSwap } from "../hooks/useSwap";
import { SwapConfirmModal } from "./SwapConfirmModal";
import { WalletButton } from "./WalletButton";
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
type Section = "overview" | "pantry" | "bake" | "crumbs" | "jarScore" | "settings";

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

const EcosystemIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const JarScoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 2l1.5 3.5 3.5.5-2.5 2.5.6 3.5L8 10.5l-3.1 1.5.6-3.5L3 6l3.5-.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 2a5.5 5.5 0 0 0-5.5 5.5c0 2.5-.8 3.5-1.5 4.5h14c-.7-1-1.5-2-1.5-4.5A5.5 5.5 0 0 0 9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 15a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  walletAddress: string;
}

export function AppShell({ walletAddress }: Props) {
  const [section, setSection] = useState<Section>("overview");
  const [networkOpen, setNetworkOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
      case "jarScore": return <JarScoreSection />;
      case "settings": return <SettingsSection />;
      default: return <OverviewSection walletAddress={walletAddress} swap={swap} onNavigate={setSection} />;
    }
  }

  return (
    <div className={styles.shell}>

      {/* ── Full-width app header — spans sidebar + content ─── */}
      <header className={styles.appHeader}>
        <div className={styles.appHeaderLeft}>
          <span className={styles.topbarLogo} aria-hidden="true">🍪</span>
          <div className={styles.topbarBrandGroup}>
            <span className={styles.topbarBrandName}>Cookie Chain</span>
            <span className={styles.topbarBrandTag}>Your on-chain kitchen.</span>
          </div>
          {/* Mobile brand uses same elements, CSS hides tag on narrow */}
        </div>
        <div className={styles.appHeaderRight}>
          {/* Notification bell — desktop only */}
          <button className={styles.bellBtn} aria-label="Notifications" onClick={() => setShowNotifications(v => !v)}>
            <BellIcon />
          </button>
          {/* Notifications flyout */}
          {showNotifications && (
            <div className={styles.notificationsPanel} role="dialog" aria-label="Notifications">
              <p className={styles.notificationsEmpty}>No notifications yet.</p>
            </div>
          )}
          {/* Network selector */}
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
                <div className={styles.networkItem} role="option" aria-selected="true">
                  <span className={styles.chainDotSm} aria-hidden="true" />
                  <span className={styles.networkItemName}>Cookie Chain</span>
                  <svg className={styles.networkCheck} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.networkDivider} aria-hidden="true" />
                <div className={styles.networkComingSoon}>More networks coming soon</div>
              </div>
            )}
          </div>
          {connected && <WalletButton />}
        </div>
      </header>

      {/* ── Below-header row: sidebar + main content ─────────── */}
      <div className={styles.belowHeader}>

        {/* ── Desktop sidebar — starts BELOW the header ────── */}
        <aside className={styles.sidebar} aria-label="Main navigation">

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

            {/* DISCOVER group */}
            <div className={styles.navSpacer} />
            <p className={styles.navLabel}>Discover</p>
            <a href="https://cookiescan.io" target="_blank" rel="noopener noreferrer" className={styles.navItem}>
              <span className={styles.navIcon}><EcosystemIcon /></span>
              <span className={styles.navLabel2}>Ecosystem</span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className={styles.navExternal}>
                <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>

            {/* EXTRAS group */}
            <div className={styles.navSpacer} />
            <p className={styles.navLabel}>Extras</p>
            <button
              className={`${styles.navItem} ${section === "jarScore" ? styles.navItemActive : ""}`}
              onClick={() => setSection("jarScore")}
              aria-current={section === "jarScore" ? "page" : undefined}
            >
              <span className={styles.navIcon}><JarScoreIcon /></span>
              <span className={styles.navLabel2}>Jar Score</span>
            </button>
            <button
              className={`${styles.navItem} ${section === "settings" ? styles.navItemActive : ""}`}
              onClick={() => setSection("settings")}
              aria-current={section === "settings" ? "page" : undefined}
            >
              <span className={styles.navIcon}><SettingsIcon /></span>
              <span className={styles.navLabel2}>Settings</span>
            </button>
          </nav>

          {/* Cookie cluster decoration */}
          <img
            src={sidebarCookieCluster}
            alt=""
            aria-hidden="true"
            className={styles.sidebarCookieCluster}
          />

          {/* Chain status footer */}
          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarStatusCard}>
              <div className={styles.statusTopRow}>
                <span className={styles.chainDot} aria-hidden="true" />
                <div className={styles.chainInfo}>
                  <span className={styles.chainName}>Cookie Chain</span>
                  <span className={styles.chainStatus}>Healthy</span>
                </div>
              </div>
              <a href="https://cookiescan.io" target="_blank" rel="noopener noreferrer" className={styles.statusLink}>
                View on CookieScan ↗
              </a>
            </div>
          </div>
        </aside>

        {/* ── Main content column ───────────────────────────── */}
        <div className={styles.body}>
          <main className={styles.content}>
            {renderSection()}
          </main>
        </div>

      </div>{/* end belowHeader */}

      {/* ── Mobile bottom tab bar ────────────────────────────── */}
      <nav className={styles.bottomBar} aria-label="Bottom navigation">
        {mainNavItems.map(({ id, label, Icon, bridge }) => (
          <button
            key={id}
            className={`${styles.tabBtn} ${!bridge && section === id ? styles.tabBtnActive : ""}`}
            onClick={() => bridge ? handleBridge() : setSection(id as Section)}
            aria-current={!bridge && section === id ? "page" : undefined}
          >
            <span className={styles.tabIcon}><Icon /></span>
            <span className={styles.tabLabel}>{label === "Overview" ? "Home" : label}</span>
          </button>
        ))}
      </nav>

      {/* Swap confirm modal */}
      <SwapConfirmModal swap={swap} />
    </div>
  );
}

// ── Jar Score placeholder section ────────────────────────────────────────────

function JarScoreSection() {
  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "var(--cream)", marginBottom: "0.5rem" }}>
        Jar Score
      </h1>
      <p style={{ color: "var(--crumb)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
        Your Jar Score reflects your activity on Cookie Chain.
      </p>
      <div style={{
        background: "rgba(50,28,11,0.55)",
        border: "1px solid rgba(240,192,96,0.13)",
        borderRadius: "var(--radius-xl)",
        padding: "2rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        maxWidth: "360px",
      }}>
        <span style={{ fontSize: "4rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--butter)", lineHeight: 1 }}>—</span>
        <p style={{ color: "var(--crumb)", fontSize: "0.8125rem", textAlign: "center", margin: 0 }}>
          Connect your wallet and make some swaps to earn a score.
        </p>
      </div>
    </div>
  );
}

// ── Settings placeholder section ─────────────────────────────────────────────

function SettingsSection() {
  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "var(--cream)", marginBottom: "0.5rem" }}>
        Settings
      </h1>
      <p style={{ color: "var(--crumb)", fontSize: "0.9375rem" }}>
        Settings — coming soon.
      </p>
    </div>
  );
}
