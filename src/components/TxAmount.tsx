/**
 * TxAmount — renders a transaction amount string with visual treatment.
 *
 * For swap amounts like "100 COOK → 0.013 CHAT":
 *   - splits on " → "
 *   - left side (spent): muted amber
 *   - arrow: dimmer crumb colour
 *   - right side (received): brighter success-tinted cream
 *
 * For single-side amounts like "3,530 COOK" or "Bridge · 10 COOK":
 *   - renders as-is, amber colour
 *
 * No new dependencies — pure inline spans.
 */

interface Props {
  amount: string;
  className?: string;
}

export function TxAmount({ amount, className }: Props) {
  const parts = amount.split(" → ");

  if (parts.length === 2) {
    const [spent, received] = parts;
    return (
      <span className={className}>
        <span style={{ color: "var(--crumb)", opacity: 0.9 }}>{spent}</span>
        <span style={{ color: "var(--crumb)", opacity: 0.5, padding: "0 0.2em" }}>→</span>
        <span style={{ color: "var(--success)", opacity: 0.9 }}>{received}</span>
      </span>
    );
  }

  // Single side — just render as-is
  return <span className={className}>{amount}</span>;
}
