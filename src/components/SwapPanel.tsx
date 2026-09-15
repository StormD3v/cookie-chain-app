import { useState, useEffect, useRef } from "react";
import type { SwapToken } from "../types/cookie";
import type { UseSwapResult } from "../hooks/useSwap";
import styles from "./SwapPanel.module.css";

// ── Well-known tokens ─────────────────────────────────────────────────────────
// The COOK native mint is the same address as wSOL on Solana — context is
// Cookie Chain only here, so So11…112 = COOK.
export const KNOWN_TOKENS: SwapToken[] = [
  {
    mint: "So11111111111111111111111111111111111111112",
    symbol: "COOK",
    name: "Cookie (native)",
    decimals: 9,
  },
  {
    // Real Cookie Chain bCOOK mint — liquid-staked COOK via the bCOOK stake pool
    mint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz",
    symbol: "bCOOK",
    name: "bakedCOOK",
    decimals: 9,
  },
  {
    // Highest 24h volume on Cookie Chain as of last pool check
    mint: "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q",
    symbol: "CHAT",
    name: "Cookie Chat",
    decimals: 6,
  },
];

// ── Debounce ──────────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  swap: UseSwapResult;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SwapPanel({ swap }: Props) {
  const [inputMint, setInputMint] = useState(KNOWN_TOKENS[0].mint);
  const [outputMint, setOutputMint] = useState(KNOWN_TOKENS[1].mint);
  const [amount, setAmount] = useState("");
  const debouncedAmount = useDebounce(amount, 600);

  // Track previous debounced amount to avoid redundant quote fetches
  const prevQuoteKey = useRef("");

  const inputToken = KNOWN_TOKENS.find((t) => t.mint === inputMint)!;
  const outputToken = KNOWN_TOKENS.find((t) => t.mint === outputMint)!;

  // Auto-fetch quote whenever amount/pair changes (after debounce)
  useEffect(() => {
    const key = `${inputMint}:${outputMint}:${debouncedAmount}`;
    if (
      !debouncedAmount ||
      Number(debouncedAmount) <= 0 ||
      inputMint === outputMint ||
      key === prevQuoteKey.current
    ) return;
    prevQuoteKey.current = key;
    swap.getQuote({ inputMint, outputMint, amount: debouncedAmount });
  }, [debouncedAmount, inputMint, outputMint, swap]);

  // Flip tokens
  function flip() {
    setInputMint(outputMint);
    setOutputMint(inputMint);
  }

  // Format raw output amount for display (raw string → human-readable)
  function formatOut(raw: string, decimals: number): string {
    try {
      const n = Number(BigInt(raw)) / 10 ** decimals;
      return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
    } catch {
      return raw;
    }
  }

  const isQuoting = swap.stage === "quoting";
  const hasQuote = swap.stage === "quoted" || swap.stage === "confirming";
  const canConfirm = hasQuote && swap.quote !== null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Swap tokens</h2>

      {/* ── Input token ──────────────────────────────────────── */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="swap-amount">You pay</label>
        <div className={styles.inputRow}>
          <input
            id="swap-amount"
            className={styles.amountInput}
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount to swap"
          />
          <TokenSelect
            id="swap-input-token"
            value={inputMint}
            onChange={(m) => setInputMint(m)}
            exclude={outputMint}
          />
        </div>
      </div>

      {/* ── Flip button ───────────────────────────────────────── */}
      <div className={styles.flipRow}>
        <button
          className={styles.flipBtn}
          onClick={flip}
          aria-label="Flip tokens"
          title="Flip tokens"
        >
          ⇅
        </button>
      </div>

      {/* ── Output token ─────────────────────────────────────── */}
      <div className={styles.field}>
        <label className={styles.label} htmlFor="swap-output-token">You receive</label>
        <div className={styles.inputRow}>
          <div className={styles.outputAmount} aria-live="polite">
            {isQuoting ? (
              <span className={styles.quoting}>…</span>
            ) : swap.quote ? (
              <span>{formatOut(swap.quote.expectedOut, outputToken.decimals)}</span>
            ) : (
              <span className={styles.placeholder}>—</span>
            )}
          </div>
          <TokenSelect
            id="swap-output-token"
            value={outputMint}
            onChange={(m) => setOutputMint(m)}
            exclude={inputMint}
          />
        </div>
      </div>

      {/* ── Quote details ─────────────────────────────────────── */}
      {swap.quote && (
        <dl className={styles.quoteDetails} aria-label="Swap quote details">
          <div className={styles.quoteRow}>
            <dt>Rate</dt>
            <dd>
              1 {inputToken.symbol} ≈{" "}
              {formatOut(
                String(
                  Math.round(
                    Number(swap.quote.expectedOut) / Number(swap.quote.amountIn)
                  )
                ),
                outputToken.decimals
              )}{" "}
              {outputToken.symbol}
            </dd>
          </div>
          <div className={styles.quoteRow}>
            <dt>Price impact</dt>
            <dd className={parseFloat(swap.quote.priceImpactPct) > 1 ? styles.warn : undefined}>
              {swap.quote.priceImpactPct}
            </dd>
          </div>
          <div className={styles.quoteRow}>
            <dt>Minimum received</dt>
            <dd>
              {formatOut(swap.quote.minOut, outputToken.decimals)} {outputToken.symbol}
            </dd>
          </div>
          {swap.quote.candyShopFeeBps !== null && (
            <div className={styles.quoteRow}>
              <dt>Aggregator fee</dt>
              <dd>{swap.quote.candyShopFeeBps} bps</dd>
            </div>
          )}
          <div className={styles.quoteRow}>
            <dt>Slippage</dt>
            <dd>{swap.quote.slippageBps} bps</dd>
          </div>
          <div className={styles.quoteRow}>
            <dt>Route</dt>
            <dd>{swap.quote.route.venues.join(" → ")}</dd>
          </div>
        </dl>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {swap.stage === "error" && swap.error && (
        <p className={styles.error} role="alert">{swap.error}</p>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className={styles.actions}>
        <button
          className={styles.confirmBtn}
          onClick={swap.openConfirm}
          disabled={!canConfirm}
          aria-disabled={!canConfirm}
        >
          <span aria-hidden="true">🔥</span>
          <span className={styles.confirmBtnDivider} aria-hidden="true" />
          Bake swap
        </button>
        {(swap.stage !== "idle" && swap.stage !== "quoting") && (
          <button className={styles.resetBtn} onClick={swap.reset}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ── TokenSelect sub-component ─────────────────────────────────────────────────

interface TokenSelectProps {
  id: string;
  value: string;
  onChange: (mint: string) => void;
  exclude: string;
}

function TokenSelect({ id, value, onChange, exclude }: TokenSelectProps) {
  return (
    <select
      id={id}
      className={styles.tokenSelect}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Select token"
    >
      {KNOWN_TOKENS.filter((t) => t.mint !== exclude).map((t) => (
        <option key={t.mint} value={t.mint}>
          {t.symbol}
        </option>
      ))}
    </select>
  );
}
