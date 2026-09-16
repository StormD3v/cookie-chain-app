import type { UseSwapResult } from "../hooks/useSwap";
import { useTokenBalances } from "../hooks/useTokenBalances";
import { useActivity } from "../hooks/useActivity";
import { SwapPanel } from "./SwapPanel";
import { TxDetailModal } from "./TxDetailModal";
import type { ActivityItem } from "../types/cookie";
import { useState } from "react";
import { getTokenLogo } from "../lib/tokenLogos";
import { TxAmount } from "./TxAmount";
import { ReceiveModal } from "./ReceiveModal";
import { SendModal } from "./SendModal";
import cookieJarHug from "../assets/cookie-jar-hug.png";
import cookingChefCookie from "../assets/cooking-chef-cookie.png";
import cookieRunning from "../assets/cookie-running.png";
import styles from "./OverviewSection.module.css";

// ── Time-of-day greeting — uses visitor's LOCAL browser time via new Date() ──
// Confirmed: new Date().getHours() returns the browser's local hour, not UTC.
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
const ReceivedRowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M10 3L3 10M3 10h5M3 10V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function getRowIcon(desc: string, amount?: string | null) {
  const d = desc.toLowerCase();
  const a = (amount ?? "").toLowerCase();
  if (d.includes("swap") || d.includes("exchange") || a.includes("→")) return <SwapRowIcon />;
  if (d.includes("bridge")) return <BridgeRowIcon />;
  if (d.includes("received") || d.includes("receive")) return <ReceivedRowIcon />;
  if (d.includes("transfer") || d.includes("sent") || d.includes("send")) return <SentRowIcon />;
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
  const [showReceive, setShowReceive] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Portfolio totals
  const totalUsd = balances.reduce((s, b) => s + (b.usdValue ?? 0), 0);
  const nativeCook = balances.find(b => b.symbol === "COOK");
  const cookAmt = nativeCook?.uiAmount ?? 0;

  // ── Jar Heat stats — derived from real data only ──────────────────────────
  const confirmedTxs = transactions.filter(t => t.status === "confirmed");
  const txCount = confirmedTxs.length;
  const swapCount = confirmedTxs.filter(t =>
    t.description.toLowerCase().includes("swap") ||
    t.description.toLowerCase().includes("exchange")
  ).length;
  // Token count from balances (non-zero holdings only)
  const tokenCount = balances.filter(b => (b.uiAmount ?? 0) > 0).length;

  // ── Heat score — composite so the bar has real range to move in ───────────
  // Formula: each tx = 1pt, each swap = 2pt extra (swaps already counted in
  // txCount so add 2 more for the extra weight), each distinct token = 3pt.
  // Ceiling = 100 points → represents a genuinely high activity session.
  // Examples: 10 regular txs = 10%, 20 txs + 5 swaps + 4 tokens = 42%,
  //           50 txs + 20 swaps + 8 tokens = 114 → clamped to 100%.
  const heatScore = txCount + swapCount * 2 + tokenCount * 3;
  const HEAT_CEILING = 100;
  const heatPct = Math.min(100, Math.round((heatScore / HEAT_CEILING) * 100));

  // Heat level thresholds match the new, wider scale
  const heatLevel: "hot" | "warm" | "cool" =
    heatPct >= 60 ? "hot" : heatPct >= 20 ? "warm" : "cool";

  const heatLabel = heatLevel === "hot" ? "Very active today 🔥"
    : heatLevel === "warm" ? "Building momentum 📈"
      : "Just warming up 🍪";

  // ── Subtitle: 2 variants based on activity level ─────────────────────────
  const heroSubtitle = heatLevel !== "cool"
    ? "Your jar is looking healthy. Keep cooking!"
    : "Your jar is full of possibilities.";

  // Derive sparkline from transaction history
  const sparkline = deriveSparklinePoints(cookAmt, transactions);
  const sparklinePath = smoothPath(sparkline.points);
  const hasRealData = confirmedTxs.length >= 3;

  // Percentage change: oldest point → newest point in the sparkline
  // Points are [x,y] normalised to SVG coords; we need the raw balance values.
  // Re-derive the balance array to get the actual oldest and newest values.
  const pctChange: number | null = (() => {
    if (!hasRealData || sparkline.flat) return null;
    // deriveSparklinePoints returns coords normalised from the balance array.
    // Reconstruct oldest balance: walk backwards from cookAmt through confirmed txs.
    const confirmed = confirmedTxs.slice(); // newest first
    const balances: number[] = [cookAmt];
    for (const tx of confirmed) {
      const delta = parseCookDelta(tx.amount);
      balances.push(balances[balances.length - 1] - delta);
    }
    const oldest = balances[balances.length - 1];
    if (oldest === 0 || !Number.isFinite(oldest)) return null;
    return ((cookAmt - oldest) / Math.abs(oldest)) * 100;
  })();

  // Allocation bars: percentage share of total USD per token
  function allocationPct(usd: number): number {
    if (totalUsd <= 0) return 0;
    return Math.min(100, (usd / totalUsd) * 100);
  }

  return (
    <div className={styles.overview}>
      {/* ── Left column ─────────────────────────────────────── */}
      <div className={styles.leftCol}>

        {/* Hero banner — mascot + greeting */}
        <div className={styles.heroBanner}>
          <img src={cookieJarHug} alt="" aria-hidden="true" className={styles.heroMascot} />
          <div className={styles.heroText}>
            <p className={styles.heroGreeting}>{getGreeting()}, Cookie Connoisseur!</p>
            <p className={styles.heroSub}>{heroSubtitle}</p>
          </div>
        </div>

        {/* Portfolio jar card */}
        <section className={styles.jarCard}>
          <div className={styles.jarCardTop}>
            <div>
              <div className={styles.jarLabelRow}>
                <p className={styles.jarLabel}>YOUR JAR</p>
                <button
                  className={styles.eyeBtn}
                  onClick={() => setBalanceHidden(h => !h)}
                  aria-label={balanceHidden ? "Show balance" : "Hide balance"}
                  type="button"
                >
                  {balanceHidden ? (
                    /* eye-off */
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M1 1l12 12M5.5 5.6A2 2 0 0 0 8.4 8.5M2.5 3.5C1.5 4.5 1 6 1 7s2 4 6 4a8 8 0 0 0 3-.6M5 2.3A8 8 0 0 1 7 2c4 0 6 2.5 6 5a5.5 5.5 0 0 1-.8 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M1 7s2-4.5 6-4.5S13 7 13 7s-2 4.5-6 4.5S1 7 1 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      <circle cx="7" cy="7" r="1.75" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className={styles.jarUsd}>
                {balanceHidden ? "••••" : `$${totalUsd.toFixed(2)}`}
                {!balanceHidden && pctChange !== null && (
                  <span className={`${styles.jarChangeBadge} ${pctChange > 0.05 ? styles.jarChangeBadgePos :
                    pctChange < -0.05 ? styles.jarChangeBadgeNeg :
                      styles.jarChangeBadgeFlat
                    }`}>
                    {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}%
                  </span>
                )}
              </p>
              <p className={styles.jarCook}>
                {balanceHidden
                  ? "•••• COOK"
                  : `${cookAmt.toLocaleString(undefined, { maximumFractionDigits: 4 })} COOK`
                }
              </p>
            </div>
            {/* Balance trend sparkline — real data, fills card width */}
            <div className={styles.sparklinePlaceholder} aria-label={hasRealData ? "Balance trend" : "No recent activity"}>
              <p className={styles.sparklineLabel}>{hasRealData ? "Balance trend" : "Recent activity"}</p>
              {(() => {
                const lineColor = !hasRealData || pctChange === null ? "var(--crumb)"
                  : pctChange > 0.05 ? "var(--success)"
                    : pctChange < -0.05 ? "var(--error)"
                      : "var(--crumb)";
                const lineOpacity = hasRealData ? 0.85 : 0.3;
                // Unique gradient ID per render — avoids collision with the
                // flame SVG gradients already on the page
                const gradId = "sparkFill";
                // Close the sparkline path down to y=40 to form a filled area.
                // Append "L 120,40 L 0,40 Z" to the existing cubic-bezier path.
                const fillPath = sparklinePath + " L 120,40 L 0,40 Z";
                return (
                  <svg
                    viewBox="0 0 120 40"
                    className={styles.sparklineSvg}
                    aria-hidden="true"
                    overflow="visible"
                  >
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity={0.25 * lineOpacity} />
                        <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {/* Gradient fill area — drawn first so line sits on top */}
                    <path
                      d={fillPath}
                      fill={`url(#${gradId})`}
                      stroke="none"
                    />
                    {/* Original line — unchanged */}
                    <path
                      d={sparklinePath}
                      fill="none"
                      stroke={lineColor}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={lineOpacity}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                );
              })()}
            </div>
          </div>
          <p className={styles.jarChange}>
            {hasRealData ? "Based on recent swaps" : "No recent transactions"}
          </p>
        </section>

        {/* Quick actions */}
        <section className={styles.quickActions}>
          {/* Send */}
          <button className={styles.qaBtn} aria-label="Send" onClick={() => setShowSend(true)}>
            <span className={styles.qaIcon}><SendIcon /></span>
            <span className={styles.qaLabel}>Send</span>
          </button>

          {/* Receive — opens address modal */}
          <button className={styles.qaBtn} aria-label="Receive" onClick={() => setShowReceive(true)}>
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

        {/* ── Jar Heat ────────────────────────────────────── */}
        <section className={styles.heatCard}>
          <div className={styles.heatPromoRow}>
            <div className={styles.heatHeader}>
              <h2 className={styles.heatTitle}>
                {/* Inline SVG flame — warm amber/orange, matches palette */}
                <svg
                  className={styles.flameIcon}
                  width="16" height="18"
                  viewBox="0 0 16 18"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 1C8 1 5 5 5 8.5C5 9.88 5.67 11.1 6.72 11.88C6.27 11.17 6 10.31 6 9.38C6 7.5 7.5 5.5 8 4C8.5 5.5 10 7.5 10 9.38C10 10.31 9.73 11.17 9.28 11.88C10.33 11.1 11 9.88 11 8.5C11 5 8 1 8 1Z"
                    fill="url(#flameTopGrad)"
                  />
                  <path
                    d="M8 17C10.76 17 13 14.76 13 12C13 9.24 10.5 7 10 5.5C10 5.5 9 7 9 9C9 10.1 9.9 11 11 11C10.5 12 9.38 13 8 13C6.62 13 5.5 12 5 11C6.1 11 7 10.1 7 9C7 7 6 5.5 6 5.5C5.5 7 3 9.24 3 12C3 14.76 5.24 17 8 17Z"
                    fill="url(#flameBodyGrad)"
                  />
                  <defs>
                    <linearGradient id="flameTopGrad" x1="8" y1="1" x2="8" y2="12" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FFF0A0" />
                      <stop offset="100%" stopColor="#F0A030" />
                    </linearGradient>
                    <linearGradient id="flameBodyGrad" x1="8" y1="5" x2="8" y2="17" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#F0C060" />
                      <stop offset="60%" stopColor="#E06020" />
                      <stop offset="100%" stopColor="#C03010" />
                    </linearGradient>
                  </defs>
                </svg>
                {" "}Jar Heat
              </h2>
              <p className={styles.heatSubtitle}>Your activity level on Cookie Chain</p>
            </div>
            <img
              src={cookieRunning}
              alt=""
              aria-hidden="true"
              className={styles.heatMascot}
            />
          </div>
          <div className={styles.heatBarWrap}>
            <div className={styles.heatBarTrack}>
              <div
                className={`${styles.heatBarFill} ${heatLevel === "hot" ? styles.heatFillHot :
                  heatLevel === "warm" ? styles.heatFillWarm :
                    styles.heatFillCool
                  }`}
                style={{ width: `${heatPct}%` }}
              />
            </div>
            <span className={styles.heatPct}>{heatPct}%</span>
          </div>
          <p className={styles.heatLabel}>{heatLabel}</p>
          <div className={styles.heatStats}>
            <div className={styles.heatStat}>
              <span className={styles.heatStatVal}>{txCount}</span>
              <span className={styles.heatStatKey}>Transactions</span>
            </div>
            <div className={styles.heatStat}>
              <span className={styles.heatStatVal}>{swapCount}</span>
              <span className={styles.heatStatKey}>Swaps</span>
            </div>
            <div className={styles.heatStat}>
              <span className={styles.heatStatVal}>{tokenCount}</span>
              <span className={styles.heatStatKey}>Tokens</span>
            </div>
          </div>
        </section>

      </div>

      {/* ── Right column ────────────────────────────────────── */}
      <div className={styles.rightCol}>

        {/* Swap panel (internals untouched) */}
        <section className={styles.swapCard}>
          {/* Decorative promo row: chef illustration + label, inline flex */}
          < div className={styles.swapPromoRow} >
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
          </div >
          <SwapPanel swap={swap} />
        </section >

        {/* Crumbs feed (compact) */}
        < section className={styles.crumbsCard} >
          <div className={styles.crumbsHeader}>
            <div>
              <h2 className={styles.crumbsTitle}>Crumbs</h2>
              <p className={styles.crumbsSubtitle}>Your recent transactions</p>
            </div>
            <button className={styles.viewAllLink} onClick={() => onNavigate("crumbs")}>
              View all →
            </button>
          </div>

          {
            txLoading ? (
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
                      {getRowIcon(tx.description, tx.amount)}
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
            )
          }
        </section >
      </div >

      {/* TX detail modal */}
      < TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)
      } />

      {/* Receive address modal */}
      <ReceiveModal
        walletAddress={showReceive ? walletAddress : null}
        onClose={() => setShowReceive(false)}
      />

      {/* Send modal */}
      <SendModal
        open={showSend}
        balances={balances}
        onClose={() => setShowSend(false)}
      />
    </div >
  );
}
