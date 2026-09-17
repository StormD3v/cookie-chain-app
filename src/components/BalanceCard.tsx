import type { TokenBalance } from "../types/cookie";
import { getTokenLogo } from "../lib/tokenLogos";
import styles from "./BalanceCard.module.css";

interface Props {
  token: TokenBalance;
}

// Native COOK mint — same address as wSOL on Solana, but on Cookie Chain
// this is the native asset. Hide the raw mint string for it; show nothing
// instead of a confusing cross-chain address.
const COOK_MINT = "So11111111111111111111111111111111111111112";

/** Emoji fallback when no logo is in TOKEN_LOGOS for this mint */
const SYMBOL_EMOJI: Record<string, string> = {
  COOK: "🍪",
  bCOOK: "🔥",
  CHAT: "💬",
};

export function BalanceCard({ token }: Props) {
  const isNative = token.mint === COOK_MINT;
  const symbol = token.symbol ?? "???";
  const showMint = !isNative && token.mint;
  // Suppress "(native)" suffix — the pill already conveys this
  const showName = token.name &&
    token.name !== symbol &&
    !token.name.includes("(native)") &&
    !token.name.toLowerCase().includes("native");

  const logoSrc = getTokenLogo(token.mint);
  const fallbackEmoji = SYMBOL_EMOJI[symbol] ?? symbol.slice(0, 2);

  return (
    <div className={styles.card}>
      {/* Token logo */}
      <div className={styles.logoWrap}>
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={symbol}
            className={styles.logo}
            onError={(e) => {
              // If SVG fails to load, hide the img and show the emoji fallback
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <span
          className={styles.logoEmoji}
          style={logoSrc ? { display: "none" } : undefined}
          aria-hidden="true"
        >
          {fallbackEmoji}
        </span>
      </div>

      <div className={styles.top}>
        <span className={styles.symbol}>{symbol}</span>
        {showName && (
          <span className={styles.name}>{token.name}</span>
        )}
        {isNative && <span className={styles.nativePill}>native</span>}
      </div>

      <p className={styles.amount}>{formatAmount(token.uiAmount)}</p>

      {token.usdValue != null && token.usdValue > 0 && (
        <p className={styles.usd}>≈ ${token.usdValue < 0.01 ? token.usdValue.toFixed(4) : token.usdValue.toFixed(2)}</p>
      )}

      {showMint && (
        <p className={styles.mint} title={token.mint}>
          {token.mint.slice(0, 4)}…{token.mint.slice(-4)}
        </p>
      )}
    </div>
  );
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount === 0) return "0";
  if (amount < 0.0001) return "<0.0001";
  return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
