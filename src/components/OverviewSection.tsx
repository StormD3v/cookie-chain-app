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
import cookieJarHug from "../assets/cookie-jar-hug.webp";
import cookieRunning from "../assets/cookie-running.webp";
import mobileJarHeatMascot from "../assets/mobile-jarheat-mascot.webp";
import jarHeatFlame from "../assets/jar-heat-flame.png";
import cookieChefBakingUrl from "../assets/cookie-chef-baking.webp";
import { useSprinkle } from "../lib/useSprinkle";
import styles from "./OverviewSection.module.css";

// getGreeting() uses new Date().getHours() — that is local browser time, not UTC.
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Hyperlane bridge URL (same as AppShell) ───────────────────────────────────
const BRIDGE_URL = "https://hyperlane.cookiescan.io";
const EXPLORER = "https://cookiescan.io";

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M3 10L17 3l-7 14-2-5L3 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 9l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const ReceiveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 15h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
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
  // Server prefixes received amounts with "+" — use as direction signal
  if (a.startsWith("+")) return <ReceivedRowIcon />;
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

// ── COOK delta parser — used by pctChange pill ───────────────────────────────
// Extracts the signed COOK balance delta from a transaction amount string.
// e.g. "100 COOK → 0.013 CHAT" → -100; "500 bCOOK → 50 COOK" → +50.
// Used to walk back through confirmed txs and reconstruct oldest known balance.

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
  const sprinkle = useSprinkle();

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
  const tokenCount = balances.filter(b => (b.uiAmount ?? 0) > 0).length;

  // Volume: sum of absolute USD value across confirmed swap transactions
  // Uses a rough estimate — numeric amount parsed from the amount string.
  const volumeUsd = (() => {
    let total = 0;
    for (const tx of confirmedTxs) {
      if (tx.amount && (tx.description.toLowerCase().includes("swap") || tx.amount.includes("→"))) {
        const match = tx.amount.match(/[\d,]+\.?\d*/);
        if (match) {
          const val = parseFloat(match[0].replace(/,/g, ""));
          if (!isNaN(val) && val < 100000) total += val;
        }
      }
    }
    return total;
  })();

  // ── Heat score — composite so the bar has real range to move in ───────────
  // Formula: each tx = 1pt, each swap = 2pt extra (swaps already counted in
  // txCount so add 2 more for the extra weight), each distinct token = 3pt.
  // Ceiling = 100 points → represents a genuinely high activity session.
  // Examples: 10 regular txs = 10%, 20 txs + 5 swaps + 4 tokens = 42%,
  //           50 txs + 20 swaps + 8 tokens = 114 → clamped to 100%.
  const heatScore = txCount + swapCount * 2 + tokenCount * 3;
  const HEAT_CEILING = 100;
  const heatPct = Math.min(100, Math.round((heatScore / HEAT_CEILING) * 100));

  const heatLevel: "hot" | "warm" | "cool" =
    heatPct >= 60 ? "hot" : heatPct >= 20 ? "warm" : "cool";

  const heatLabel = heatLevel === "hot" ? "Very active today 🔥"
    : heatLevel === "warm" ? "Building momentum 📈"
      : "Just warming up 🍪";

  const heroSubtitleDesktop = "Your jar is looking healthy. Keep cooking!";
  const heroSubtitleMobile = "Your jar is full of possibilities.";

  const pctChange: number | null = (() => {
    if (confirmedTxs.length < 3) return null;
    const confirmed = confirmedTxs.slice(); // newest first
    const bal: number[] = [cookAmt];
    for (const tx of confirmed) {
      const delta = parseCookDelta(tx.amount);
      bal.push(bal[bal.length - 1] - delta);
    }
    const oldest = bal[bal.length - 1];
    if (oldest === 0 || !Number.isFinite(oldest)) return null;
    // Require meaningful movement to avoid noise from dust transactions
    const change = ((cookAmt - oldest) / Math.abs(oldest)) * 100;
    return change;
  })();

  // Allocation bars: percentage share of total USD per token
  function allocationPct(usd: number): number {
    if (totalUsd <= 0) return 0;
    return Math.min(100, (usd / totalUsd) * 100);
  }

  return (
    <div className={styles.overview}>
      <div className={styles.leftCol}>

        <section className={styles.jarCard}>

          <div className={styles.heroZone}>
            <img
              src={cookieJarHug}
              alt=""
              aria-hidden="true"
              className={styles.heroMascot}
              onClick={sprinkle}
              style={{ cursor: "pointer" }}
            />
            <div className={styles.heroText}>
              <p className={styles.heroGreeting}>{getGreeting()}, Cookie Connoisseur! 👋</p>
              <p className={styles.heroSub}>
                {/* Desktop subtitle via CSS class toggle; mobile subtitle shown on small screens */}
                <span className={styles.heroSubDesktop}>{heroSubtitleDesktop}</span>
                <span className={styles.heroSubMobile}>{heroSubtitleMobile}</span>
              </p>
            </div>
          </div>

          {/* Visual divider between hero and balance zones */}
          <div className={styles.heroDivider} aria-hidden="true" />

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
          </div>
        </section>

        <section className={styles.quickActions}>
          <button className={styles.qaBtn} aria-label="Send" onClick={() => setShowSend(true)}>
            <span className={styles.qaIcon}><SendIcon /></span>
            <span className={styles.qaLabel}>Send</span>
          </button>

          <button className={styles.qaBtn} aria-label="Receive" onClick={() => setShowReceive(true)}>
            <span className={styles.qaIcon}><ReceiveIcon /></span>
            <span className={styles.qaLabel}>Receive</span>
          </button>

          <button className={`${styles.qaBtn} ${styles.qaBtnPrimary}`} aria-label="Bake Swap" onClick={() => onNavigate("bake")}>
            <span className={styles.qaIcon}><BakeSwapIcon /></span>
            <span className={styles.qaLabel}>Bake Swap</span>
          </button>

          <button className={styles.qaBtn} aria-label="Bridge to Solana" onClick={() => window.open(BRIDGE_URL, "_blank", "noopener,noreferrer")}>
            <span className={styles.qaIcon}><BridgeIcon /></span>
            <span className={styles.qaLabel}>Bridge</span>
          </button>
        </section>

        <section className={styles.pantryCard}>
          <div className={styles.pantryHeader}>
            <div>
              <h2 className={styles.pantryTitle}>Your Pantry</h2>
              <p className={styles.pantrySubtitle}>All your tokens in one place</p>
            </div>
            <div className={styles.pantryHeaderRight}>
              <span className={styles.pantryPctLabel}>% portfolio</span>
              <button className={styles.manageLink} onClick={() => onNavigate("pantry")}>
                Manage tokens →
              </button>
            </div>
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
                        <span className={styles.tokenUsd}>≈ ${token.usdValue < 0.01 ? token.usdValue.toFixed(4) : token.usdValue.toFixed(2)}</span>
                      )}
                    </div>
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

        <section className={styles.heatCard}>
          <div className={styles.heatMascotZone} aria-hidden="true">
            {/* CSS shows one or the other via media query — no UA sniffing */}
            <img
              src={cookieRunning}
              alt=""
              aria-hidden="true"
              className={`${styles.heatMascot} ${styles.heatMascotDesktop}`}
              onClick={sprinkle}
              style={{ cursor: "pointer" }}
            />
            <img
              src={mobileJarHeatMascot}
              alt=""
              aria-hidden="true"
              className={`${styles.heatMascot} ${styles.heatMascotMobile}`}
              onClick={sprinkle}
              style={{ cursor: "pointer" }}
            />
          </div>

          <div className={styles.heatContent}>
            <div className={styles.heatHeader}>
              <h2 className={styles.heatTitle}>
                <img
                  src={jarHeatFlame}
                  alt=""
                  aria-hidden="true"
                  className={styles.flameIcon}
                />
                {" "}Jar Heat
              </h2>
              <p className={styles.heatSubtitle}>Your activity level on Cookie Chain</p>
            </div>

            <div className={styles.heatMeterWrap}>
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
            </div>

            <div className={styles.heatStats}>
              <div className={styles.heatStat}>
                <span className={styles.heatStatVal}>{txCount}</span>
                <span className={styles.heatStatKey}>Transactions</span>
              </div>
              <div className={styles.heatStat}>
                <span className={styles.heatStatVal}>${volumeUsd > 0 ? volumeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}</span>
                <span className={styles.heatStatKey}>Volume</span>
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
          </div>
        </section>

      </div>

      <div className={styles.rightCol}>

        <section className={styles.swapCard}>
          <SwapPanel swap={swap} />
        </section>

        {/* Mobile Bake Swap promo — chef image as CSS background to avoid HTML overlap */}
        <div
          className={styles.mobileSwapPromo}
          style={{ backgroundImage: `url(${cookieChefBakingUrl})` }}
        >
          <div className={styles.mobileSwapPromoContent}>
            <span className={styles.mobileSwapPromoTag}>Quick Swap</span>
            <h3 className={styles.mobileSwapPromoHeading}>Bake Swap</h3>
            <p className={styles.mobileSwapPromoSub}>Trade tokens on Cookie Chain</p>
            <button
              className={styles.mobileSwapPromoBtn}
              onClick={() => onNavigate("bake")}
            >
              Start Baking →
            </button>
          </div>
        </div>

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

      <TxDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />

      <ReceiveModal
        walletAddress={showReceive ? walletAddress : null}
        onClose={() => setShowReceive(false)}
      />

      <SendModal
        open={showSend}
        balances={balances}
        onClose={() => setShowSend(false)}
      />
    </div>
  );
}
