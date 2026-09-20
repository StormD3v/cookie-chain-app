import { useCallback, useRef } from "react";

const COLORS = [
  "rgba(240,192,96,0.9)",
  "rgba(200,120,32,0.85)",
  "rgba(255,220,120,0.8)",
  "rgba(240,160,60,0.75)",
  "rgba(255,200,80,0.9)",
];

export function useSprinkle() {
  const busy = useRef(false);

  const burst = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (busy.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    busy.current = true;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = "clientX" in e ? e.clientX : e.touches[0].clientX;
    const cy = "clientY" in e ? e.clientY : e.touches[0].clientY;
    const count = 10 + Math.floor(Math.random() * 4); // 10–13

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "sprinkle";

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist  = 20 + Math.random() * 28;
      const tx    = Math.round(Math.cos(angle) * dist);
      const ty    = Math.round(Math.sin(angle) * dist) - 16; // bias upward
      const rot   = `${Math.round((Math.random() - 0.5) * 320)}deg`;

      el.style.cssText = [
        `left:${cx - 4}px`, `top:${cy - 4}px`,
        `background:${COLORS[i % COLORS.length]}`,
        `--tx:${tx}px`, `--ty:${ty}px`, `--rot:${rot}`,
        `animation-delay:${Math.round(Math.random() * 60)}ms`,
      ].join(";");

      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1000);
    }

    setTimeout(() => { busy.current = false; }, 1000);
  }, []);

  return burst;
}
