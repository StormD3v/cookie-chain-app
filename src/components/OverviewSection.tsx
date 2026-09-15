import type { UseSwapResult } from "../hooks/useSwap";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { useActivity } from "../hooks/useActivity";
import { SwapPanel } from "./SwapPanel";
import { TxDetailModal } from "./TxDetailModal";
import type { ActivityItem } from "../types/cookie";
import { useState } from "react";
import { getTokenLogo } from "../lib/tokenLogos";
import { TxAmount } from "./TxAmount";
import cookieJarHug from "../assets/cookie-jar-hug.png";
import cookingChefCookie from "../assets/cooking-chef-cookie.png";
import styles from "./OverviewSection.module.css";

// ── Time-of-day greeting (no new dependency — pure Date math) ────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Hyperlane bridge URL (same as AppShell) ───────────────────────────────────
const BRIDGE_URL = "https://hyperlane.cookiescan.io";
const EXPLORER = "https://cookiescan.io";

// ── Quick action icons ────────────────────────────────────────────────────────
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M4 16L16 4M16 4H8M16 4v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ReceiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M16 4L4 16M4 16h8M4 16V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BakeSwapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 7h14M14 3l3 4-3 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 13H3M6 17l-3-4 3-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BridgeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M2 14c0-4.42 3.58-8 8-8 2.21 0 4.21.9 5.66 2.34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M18 14c0-4.42-3.58-8-8-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M2 14h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5 14v2M10 14v2M15 14v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

// ── Activity icons (reused from ActivityFeed) ─────────────────────────────────
const SwapRowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2 4.5h9M8.5 2l2.5 2.5L8.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 8.5H2M4.5 6l-2.5 2.5L4.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const BridgeRowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <rect x="1" y="4" width="3.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <rect x="8.5" y="5.5" width="3.5" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.5 5.75h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M7 4.25l1.5 1.5L7 7.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SentRowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M3 10L10 3M10 3H5M10 3v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TxRowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" />
  </svg>
);

function getRowIcon(desc: string) {
  const d = desc.toLowerCase();
  if (d.includes("swap") || d.includes("exchange")) return <SwapRowIcon />;
  if (d.includes("bridge")) return <BridgeRowIcon />;
  if (d.includes("transfer") || d.includes("sent")) return <SentRowIcon />;
  return <TxRowIcon />;
}

function relativeTime(unixSeconds: number): string {
  const diff = Math.floor((Date.now() - unixSeconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Balance sparkline derivation ─────────────────────────────────────────────
//
// Walk backwards through transactions, extracting COOK deltas from the amount
// string (e.g. "100 COOK → 0.013 CHAT" → -100, "500 bCOOK → 50 COOK" → +50).
// Most-recent point = current cookAmt; each prior step reconstructs the prior
// balance. Only COOK (native) deltas are tracked — SPL-only swaps produce 0.
//
// Returns an array of balance points ordered oldest→newest, normalised to
// fit a 120×40 SVG viewBox. Falls back to a flat line if fewer than 3 points.

function parseCookDelta(amount: string | null): number {
  if (!amount) return 0;

  // Pattern: "X COOK → Y TOKEN"  → we paid X COOK (delta = -X)
  //          "X TOKEN → Y COOK"  → we received Y COOK (delta = +Y)
  //          "X COOK"            → plain receive/transfer (delta = +X)
  const arrowIdx = amount.indexOf(" → ");
  if (arrowIdx !== -1) {
    const left = amount.slice(0, arrowIdx).trim();
    const right = amount.slice(arrowIdx + 3).trim();
    const leftVal = parseFloat(left);
    const rightVal = parseFloat(right);
    const leftIsCook = left.toUpperCase().endsWith("COOK") && !left.toUpperCase().endsWith("BCOOK");
    const rightIsCook = right.toUpperCase().endsWith("COOK") && !right.toUpperCase().endsWith("BCOOK");
    if (leftIsCook && !Number.isNaN(leftVal)) return -leftVal;
    if (rightIsCook && !Number.isNaN(rightVal)) return +rightVal;
    return 0; // SPL↔SPL swap, no native COOK change
  }

  // Single-side: "X COOK" (bridge receive, plain transfer)
  const isCook = amount.toUpperCase().endsWith("COOK") && !amount.toUpperCase().endsWith("BCOOK");
  if (isCook) {
    const val = parseFloat(amount);
    return Number.isNaN(val) ? 0 : val;
  }
  return 0;
}

function deriveSparklinePoints(
  currentCook: number,
  txs: ActivityItem[],
  svgW = 120,
  svgH = 40,
): { points: Array<[number, number]>; flat: boolean } {
  // Build balance history newest→oldest, then reverse
  const balances: number[] = [currentCook];
  for (const tx of txs) {
    if (tx.status === "failed") continue; // skip failed txs
    const delta = parseCookDelta(tx.amount);
    // Prior balance = current - what we gained (or + what we spent)
    balances.push(balances[balances.length - 1] - delta);
  }

  // Need at least 3 real data points for a meaningful shape
  if (balances.length < 3) {
    const mid = svgH / 2;
    return { points: [[0, mid], [svgW, mid]], flat: true };
  }

  // Reverse so oldest is first (left side of chart)
  const pts = [...balances].reverse();

  const minVal = Math.min(...pts);
  const maxVal = Math.max(...pts);
  const range = maxVal - minVal;

  // Normalise each point to SVG coordinates
  // Y axis: higher balance = higher on card (lower SVG y)
  const pad = 4; // px padding top/bottom
  const coords: Array<[number, number]> = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * svgW;
    const y = range === 0
      ? svgH / 2
      : pad + ((maxVal - v) / range) * (svgH - pad * 2);
    return [x, y];
  });

  return { points: coords, flat: false };
}

/**
 * Converts [x,y] point array into a smooth SVG cubic-Bezier path string
 * using Catmull-Rom → Bezier conversion (tension=0.4).
 * Stays close to data points without overshoot on sparse sets.
 */
function smoothPath(pts: Array<[number, number]>, tension = 0.4): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0][0]},${pts[0][1]} L ${pts[1][0]},${pts[1][1]}`;
  }

  let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];

    // Control points from Catmull-Rom tangents
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  return d;
}


interface Props {
  walletAddress: string;
  swap: UseSwapResult;
  onNavigate: (s: "pantry" | "bake" | "crumbs") => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OverviewSection({ walletAddress, swap, onNavigate }: Props) {
  const { balances } = useTokenBalances(walletAddress);
  const { transactions, loading: txLoading } = useActivity(walletAddress);
  const [selectedTx, setSelectedTx] = useState<ActivityItem | null>(null);

  // Portfolio totals
  const totalUsd = balances.reduce((s, b) => s + (b.usdValue ?? 0), 0);
  const nativeCook = balances.find(b => b.symbol === "COOK");
  const cookAmt = nativeCook?.uiAmount ?? 0;

  // Derive sparkline from transaction history
  const sparkline = deriveSparklinePoints(cookAmt, transactions);
  const sparklinePath = smoothPath(sparkline.points);
  // Label reflects what the chart actually shows
  const hasRealData = transactions.filter(t => t.status === "confirmed").length >= 3;

  // Allocation bars: percentage share of total USD per token
  function allocationPct(usd: number): number {
    if (totalUsd <= 0) return 0;
    return Math.min(100, (usd / totalUsd) * 100);
  }

  return (
    <div className={styles.overview}>
      {/* ── Left column ─────────────────────────────────────── */}
      <div className={styles.leftCol}>

        {/* Hero banner — mascot + greeting, no logic */}
        <div className={styles.heroBanner}>
          <img
            src={cookieJarHug}
            alt=""
            aria-hidden="true"
            className={styles.heroMascot}
          />
          <div className={styles.heroText}>
            <p className={styles.heroGreeting}>{getGreeting()}, Cookie Connoisseur!</p>
            <p className={styles.heroSub}>Your jar is full of possibilities.</p>
          </div>
        </div>

        {/* Portfolio jar card */}
        <section className={styles.jarCard}>
          <div className={styles.jarCardTop}>
            <div>
              <p className={styles.jarLabel}>YOUR JAR</p>
              <p className={styles.jarUsd}>${totalUsd.toFixed(2)}</p>
              <p className={styles.jarCook}>
                {cookAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} COOK
              </p>
            </div>
            {/* Balance trend sparkline — real data from tx history */}
            <div className={styles.sparklinePlaceholder} aria-label={hasRealData ? "Balance trend" : "No recent activity"}>
              <p className={styles.sparklineLabel}>{hasRealData ? "Balance trend" : "Recent activity"}</p>
              <svg viewBox="0 0 120 40" className={styles.sparklineSvg} aria-hidden="true">
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke="var(--butter)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={hasRealData ? 0.85 : 0.35}
                />
              </svg>
            </div>
          </div>
          <p className={styles.jarChange}>
            {hasRealData ? "Based on recent swaps" : "No recent transactions"}
          </p>
        </section>

        {/* Quick actions */}
        <section className={styles.quickActions}>
          {/* Send — disabled/coming soon */}
          <button className={`${styles.qaBtn} ${styles.qaBtnDisabled}`} disabled aria-label="Send — coming soon" title="Coming soon">
            <span className={styles.qaIcon}><SendIcon /></span>
            <span className={styles.qaLabel}>Send</span>
          </button>

          {/* Receive — placeholder */}
          <button className={styles.qaBtn} aria-label="Receive" onClick={() => onNavigate("pantry")}>
            <span className={styles.qaIcon}><ReceiveIcon /></span>
            <span className={styles.qaLabel}>Receive</span>
          </button>

          {/* Bake Swap — navigates to Bake section */}
          <button className={`${styles.qaBtn} ${styles.qaBtnPrimary}`} aria-label="Bake Swap" onClick={() => onNavigate("bake")}>
            <span className={styles.qaIcon}><BakeSwapIcon /></span>
            <span className={styles.qaLabel}>Bake Swap</span>
          </button>

          {/* Bridge — external Hyperlane handoff */}
          <button className={styles.qaBtn} aria-label="Bridge to Solana" onClick={() => window.open(BRIDGE_URL, "_blank", "noopener,noreferrer")}>
            <span className={styles.qaIcon}><BridgeIcon /></span>
            <span className={styles.qaLabel}>Bridge</span>
          </button>
        </section>

        {/* Pantry (token list) */}
        <section className={styles.pantryCard}>
          <div className={styles.pantryHeader}>
            <div>
              <h2 className={styles.pantryTitle}>Your Pantry</h2>
              <p className={styles.pantrySubtitle}>All your tokens in one place</p>
            </div>
            <button className={styles.manageLink} onClick={() => onNavigate("pantry")}>
              Manage →
            </button>
          </div>

          {balances.length === 0 ? (
            <p className={styles.emptyMsg}>No tokens found.</p>
          ) : (
            <ul className={styles.tokenList}>
              {balances.map((token) => {
                const pct = allocationPct(token.usdValue ?? 0);
                const symbol = token.symbol ?? "???";
                return (
                  <li key={token.mint} className={styles.tokenRow}>
                    {/* Token icon — real logo if available, emoji fallback */}
                    <span className={styles.tokenIcon} aria-hidden="true">
                      {getTokenLogo(token.mint) ? (
                        <img
                          src={getTokenLogo(token.mint)}
                          alt={symbol}
                          className={styles.tokenIconImg}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                            if (fb) fb.style.display = "inline";
                          }}
                        />
                      ) : null}
                      <span
                        className={styles.tokenIconEmoji}
                        style={getTokenLogo(token.mint) ? { display: "none" } : undefined}
                      >
                        {symbol === "COOK" ? "🍪" : symbol === "bCOOK" ? "🔥" : "💬"}
                      </span>
                    </span>
                    <div className={styles.tokenInfo}>
                      <span className={styles.tokenSymbol}>{symbol}</span>
                      {token.name && !token.name.toLowerCase().includes("native") && (
                        <span className={styles.tokenName}>{token.name}</span>
                      )}
                    </div>
                    <div className={styles.tokenAmounts}>
                      <span className={styles.tokenAmount}>
                        {(token.uiAmount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                      {token.usdValue != null && token.usdValue > 0 && (
                        <span className={styles.tokenUsd}>≈ ${token.usdValue.toFixed(2)}</span>
                      )}
                    </div>
                    {/* Allocation bar */}
                    <div className={styles.allocationWrap}>
                      <div className={styles.allocationBar}>
                        <div className={styles.allocationFill} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.allocationPct}>{Math.round(pct)}%</span>
                    </div>
                    <span className={styles.tokenChevron} aria-hidden="true">›</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Right column ────────────────────────────────────── */}
      <div className={styles.rightCol}>

        {/* Swap panel (internals untouched) */}
        <section className={styles.swapCard}>
          {/* Decorative promo row: chef illustration + label, inline flex */}
          <div className={styles.swapPromoRow}>
            <div className={styles.swapPromoText}>
              <p className={styles.swapPromoTitle}>🔥 Bake a Swap</p>
              <p className={styles.swapPromoSub}>Trade tokens on Cookie Chain</p>
            </div>
            <img
              src={cookingChefCookie}
              alt=""
              aria-hidden="true"
              className={styles.swapChef}
            />
          </div>
          <SwapPanel swap={swap} />
        </section>

        {/* Crumbs feed (compact) */}
        <section className={styles.crumbsCard}>
          <div className={styles.crumbsHeader}>
            <div>
              <h2 className={styles.crumbsTitle}>Crumbs</h2>
              <p className={styles.crumbsSubtitle}>Your recent transactions</p>
            </div>
            <button className={styles.viewAllLink} onClick={() => onNavigate("crumbs")}>
              View all →
            </button>
          </div>

          {txLoading ? (
            <div className={styles.crumbsLoading} aria-label="Loading">
              {[0, 1, 2].map(i => (
                <div key={i} className={`skeleton ${styles.crumbSkel}`} />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className={styles.emptyMsg}>No crumbs yet.</p>
          ) : (
            <ul className={styles.crumbsList}>
              {transactions.slice(0, 5).map(tx => (
                <li
                  key={tx.signature}
                  className={styles.crumbRow}
                  onClick={() => setSelectedTx(tx)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && setSelectedTx(tx)}
                >
                  <span className={`${styles.crumbIcon} ${tx.status === "failed" ? styles.crumbIconFailed : styles.crumbIconOk}`}>
                    {getRowIcon(tx.description)}
                  </span>
                  <div className={styles.crumbBody}>
                    <span className={styles.crumbDesc}>{tx.description}</span>
                    {tx.amount && <TxAmount amount={tx.amount} className={styles.crumbAmt} />}
                  </div>
                  <span className={styles.crumbTime}>
                    {tx.blockTime ? relativeTime(tx.blockTime) : `slot ${tx.slot}`}
                  </span>
                  <span className={`${styles.crumbBadge} ${tx.status === "failed" ? styles.crumbBadgeFail : styles.crumbBadgeOk}`}>
                    {tx.status === "confirmed" ? "Confirmed" : "Failed"}
                  </span>
                  <a
                    className={styles.crumbLink}
                    href={`${EXPLORER}/tx/${tx.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    aria-label="View on explorer"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 8L8 2M8 2H4.5M8 2v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* TX detail modal */}
      <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
    </div>
  );
}
