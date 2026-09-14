import { useEffect, useRef } from "react";
import type { UseSwapResult } from "../hooks/useSwap";
import type { SwapStage } from "../types/cookie";
import { KNOWN_TOKENS } from "./SwapPanel";
import styles from "./SwapConfirmModal.module.css";

// ── Explorer link ─────────────────────────────────────────────────────────────

const EXPLORER = "https://cookiescan.io";

function explorerUrl(sig: string) {
  return `${EXPLORER}/tx/${sig}`;
}

// ── Amount formatting (same logic as SwapPanel) ───────────────────────────────

function formatOut(raw: string, decimals: number): string {
  try {
    const n = Number(BigInt(raw)) / 10 ** decimals;
    return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
  } catch {
    return raw;
  }
}

// ── Stage metadata ────────────────────────────────────────────────────────────

interface StageInfo {
  label: string;
  description: string;
  icon: string;
}

const STAGE_INFO: Partial<Record<SwapStage, StageInfo>> = {
  confirming: {
    icon: "🍪",
    label: "Looks delicious.",
    description: "Double-check the details, then sign it.",
  },
  signing: {
    icon: "✍️",
    label: "Pen to paper…",
    description: "Approve in your Nightly wallet.",
  },
  submitting: {
    icon: "🔥",
    label: "Into the oven…",
    description: "Sending to Cookie Chain.",
  },
  pending: {
    icon: "⏳",
    label: "Baking…",
    description: "Waiting for on-chain confirmation.",
  },
  confirmed: {
    icon: "🍪",
    label: "Om nom nom.",
    description: "Swap confirmed on Cookie Chain.",
  },
  error: {
    icon: "😬",
    label: "Burnt.",
    description: "",
  },
};

// Stages where the modal should be visible
const MODAL_STAGES: SwapStage[] = [
  "confirming",
  "signing",
  "submitting",
  "pending",
  "confirmed",
  "error",
];

// Stages where execution is in-flight (spinner, no dismiss)
const IN_FLIGHT: SwapStage[] = ["signing", "submitting", "pending"];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  swap: UseSwapResult;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SwapConfirmModal({ swap }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpen = MODAL_STAGES.includes(swap.stage);
  const inFlight = IN_FLIGHT.includes(swap.stage);

  // Open/close the native <dialog>
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen && !el.open) el.showModal();
    if (!isOpen && el.open) el.close();
  }, [isOpen]);

  // Close on backdrop click — but not while a tx is in-flight
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (inFlight) return;
    if (e.target === dialogRef.current) handleDismiss();
  }

  function handleDismiss() {
    if (swap.stage === "confirmed") {
      swap.reset();
    } else {
      swap.cancelConfirm();
    }
  }

  if (!swap.quote) return null;

  const inputToken =
    KNOWN_TOKENS.find((t) => t.mint === swap.quote!.inputMint) ??
    { symbol: swap.quote.inputMint.slice(0, 6), decimals: 9 };
  const outputToken =
    KNOWN_TOKENS.find((t) => t.mint === swap.quote!.outputMint) ??
    { symbol: swap.quote.outputMint.slice(0, 6), decimals: 6 };

  const info = STAGE_INFO[swap.stage];

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      aria-modal="true"
    >
      <div className={`${styles.modal}${swap.stage === "confirmed" ? ` ${styles.modalConfirmed}` : ""}`}>
        {/* ── Header ──────────────────────────────────────────── */}
        <div className={styles.header}>
          <span className={styles.icon} aria-hidden="true">{info?.icon}</span>
          <h2 id="modal-title" className={styles.title}>{info?.label}</h2>
          {!inFlight && (
            <button
              className={styles.closeBtn}
              onClick={handleDismiss}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {info?.description && swap.stage !== "error" && (
          <p className={styles.description}>{info.description}</p>
        )}

        {/* ── Swap summary (always visible) ────────────────────── */}
        <div className={styles.summary}>
          <div className={styles.summaryToken}>
            <span className={styles.summaryLabel}>Pay</span>
            <span className={styles.summaryAmount}>
              {swap.quote.amountIn}{" "}
              <strong>{inputToken.symbol}</strong>
            </span>
          </div>
          <span className={styles.summaryArrow} aria-hidden="true">→</span>
          <div className={styles.summaryToken}>
            <span className={styles.summaryLabel}>Receive (est.)</span>
            <span className={styles.summaryAmount}>
              {formatOut(swap.quote.expectedOut, outputToken.decimals)}{" "}
              <strong>{outputToken.symbol}</strong>
            </span>
          </div>
        </div>

        {/* ── Detail rows (confirming only) ────────────────────── */}
        {swap.stage === "confirming" && (
          <dl className={styles.details}>
            <div className={styles.detailRow}>
              <dt>Minimum received</dt>
              <dd>{formatOut(swap.quote.minOut, outputToken.decimals)} {outputToken.symbol}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Price impact</dt>
              <dd className={parseFloat(swap.quote.priceImpactPct) > 1 ? styles.warn : undefined}>
                {swap.quote.priceImpactPct}
              </dd>
            </div>
            {swap.quote.candyShopFeeBps !== null && (
              <div className={styles.detailRow}>
                <dt>Aggregator fee</dt>
                <dd>{swap.quote.candyShopFeeBps} bps</dd>
              </div>
            )}
            <div className={styles.detailRow}>
              <dt>Slippage tolerance</dt>
              <dd>{swap.quote.slippageBps} bps</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Route</dt>
              <dd>{swap.quote.route.venues.join(" → ")}</dd>
            </div>
          </dl>
        )}

        {/* ── In-flight spinner ────────────────────────────────── */}
        {inFlight && (
          <div className={styles.spinnerRow} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <span className={styles.spinnerLabel}>{info?.description}</span>
          </div>
        )}

        {/* ── Pending: show signature link ─────────────────────── */}
        {swap.stage === "pending" && swap.signature && (
          <a
            className={styles.explorerLink}
            href={explorerUrl(swap.signature)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on explorer ↗
          </a>
        )}

        {/* ── Confirmed ────────────────────────────────────────── */}
        {swap.stage === "confirmed" && swap.signature && (
          <a
            className={styles.explorerLink}
            href={explorerUrl(swap.signature)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction ↗
          </a>
        )}

        {/* ── Error ────────────────────────────────────────────── */}
        {swap.stage === "error" && swap.error && (
          <p className={styles.errorMsg} role="alert">{swap.error}</p>
        )}

        {/* ── Action buttons ───────────────────────────────────── */}
        <div className={styles.actions}>
          {swap.stage === "confirming" && (
            <>
              {/* Mainnet warning — explicit acknowledgement before any tx */}
              <p className={styles.mainnetWarning}>
                ⚠️ Mainnet — this swap spends real COOK.
              </p>
              <button
                className={styles.signBtn}
                onClick={() => void swap.execute()}
              >
                Sign &amp; bake it 🔥
              </button>
              <button
                className={styles.cancelBtn}
                onClick={swap.cancelConfirm}
              >
                Not yet
              </button>
            </>
          )}

          {swap.stage === "confirmed" && (
            <button className={styles.doneBtn} onClick={swap.reset}>
              Eat another 🍪
            </button>
          )}

          {swap.stage === "error" && (
            <>
              <button
                className={styles.retryBtn}
                onClick={swap.cancelConfirm}
              >
                Start over
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
