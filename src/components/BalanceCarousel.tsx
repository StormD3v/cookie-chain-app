import { useRef, useState, useEffect, useCallback } from "react";
import type { TokenBalance } from "../types/cookie";
import { BalanceCard } from "./BalanceCard";
import styles from "./BalanceCarousel.module.css";

interface Props {
  balances: TokenBalance[];
}

export function BalanceCarousel({ balances }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const trackRef = useRef<HTMLUListElement>(null);
  // One ref per card so IntersectionObserver can identify which is visible
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Use IntersectionObserver to know which card is centred in the scroll track
  useEffect(() => {
    const track = trackRef.current;
    if (!track || balances.length <= 1) return;

    const observers: IntersectionObserver[] = [];

    balances.forEach((_, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            setActiveIdx(i);
          }
        },
        { root: track, threshold: 0.6 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [balances]);

  // Scroll to a card when dot is tapped
  const scrollTo = useCallback((idx: number) => {
    const el = cardRefs.current[idx];
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, []);

  if (balances.length === 0) return null;

  return (
    <div className={styles.carousel}>
      {/* ── Scroll track ─────────────────────────────────── */}
      <ul
        ref={trackRef}
        className={styles.track}
        role="list"
        aria-label="Token balances"
      >
        {balances.map((token, i) => (
          <li
            key={token.mint}
            ref={(el) => { cardRefs.current[i] = el; }}
            className={styles.slide}
          >
            <BalanceCard token={token} />
          </li>
        ))}
      </ul>

      {/* ── Dot indicators — only when >1 card ───────────── */}
      {balances.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Balance cards">
          {balances.map((token, i) => (
            <button
              key={token.mint}
              role="tab"
              aria-selected={i === activeIdx}
              aria-label={`${token.symbol ?? token.mint.slice(0, 6)} balance`}
              className={`${styles.dot} ${i === activeIdx ? styles.dotActive : ""}`}
              onClick={() => scrollTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
