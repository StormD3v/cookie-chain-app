import type { TokenBalance } from "../types/cookie";
import styles from "./BalanceCard.module.css";

interface Props {
  token: TokenBalance;
}

// Native COOK mint — same address as wSOL on Solana, but on Cookie Chain
// this is the native asset. Hide the raw mint string for it; show nothing
// instead of a confusing cross-chain address.
const COOK_MINT = "So11111111111111111111111111111111111111112";

export function BalanceCard({ token }: Props) {
  const isNative = token.mint === COOK_MINT;
  const symbol = token.symbol ?? "???";
  const showMint = !isNative && token.mint;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.symbol}>{symbol}</span>
        {token.name && token.name !== symbol && (
          <span className={styles.name}>{token.name}</span>
        )}
        {isNative && <span className={styles.nativePill}>native</span>}
      </div>

      <p className={styles.amount}>{formatAmount(token.uiAmount)}</p>

      {token.usdValue != null && token.usdValue > 0 && (
        <p className={styles.usd}>≈ ${token.usdValue.toFixed(2)}</p>
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
