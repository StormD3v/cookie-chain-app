/**
 * Screenshots the sparkline chart fill at real size using a static HTML mock.
 * Uses the same SVG path format and gradient approach as OverviewSection.tsx.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

// A realistic sparkline path matching what the app generates (viewBox 0 0 120 40)
// This mirrors a wallet with typical swap history showing upward trend
const SPARKLINE_PATH = "M 0.00,32.00 C 3.33,32.00 6.67,28.50 10.00,28.50 C 13.33,28.50 16.67,24.00 20.00,22.00 C 23.33,20.00 26.67,25.00 30.00,26.00 C 33.33,27.00 36.67,20.00 40.00,18.00 C 43.33,16.00 46.67,14.00 50.00,12.00 C 53.33,10.00 56.67,15.00 60.00,16.00 C 63.33,17.00 66.67,11.00 70.00,10.00 C 73.33,9.00 76.67,13.00 80.00,14.00 C 83.33,15.00 86.67,9.00 90.00,8.00 C 93.33,7.00 96.67,9.00 100.00,9.00 C 103.33,9.00 106.67,6.50 110.00,6.00 C 113.33,5.50 116.67,5.25 120.00,5.00";
const FILL_PATH = SPARKLINE_PATH + " L 120,40 L 0,40 Z";

// Both positive (green/success) and flat (crumb) variants
const VARIANTS = [
  { name: "positive", color: "#60c080", label: "+12.5%" },
  { name: "flat",     color: "#8a6848", label: "+0.0%" },
  { name: "negative", color: "#e05050", label: "-3.2%" },
];

const HTML = (variant) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  :root { --choco:#0f0c0a; --ganache:#321c0b; --crust:#5c3c22; --crumb:#8a6848; --cream:#f5e6c8; --butter:#f0c060; --radius-xl:22px; --font-display:'Syne',sans-serif; --font-mono:'JetBrains Mono',monospace; --font-body:'Inter',sans-serif; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); font-family: var(--font-body); -webkit-font-smoothing: antialiased; padding: 1.5rem; }

  .jarCard {
    background: rgba(50,28,11,0.55); backdrop-filter: blur(12px);
    border: 1px solid rgba(240,192,96,0.13); border-radius: var(--radius-xl);
    padding: 1.25rem 1.375rem; box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    max-width: 680px;
  }
  .jarCardTop { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .jarLabel { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--crumb); margin: 0 0 0.25rem; }
  .jarUsd { font-family: var(--font-display); font-size: 2rem; font-weight: 800; letter-spacing: -0.04em; color: var(--cream); margin: 0; }
  .jarCook { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--crumb); margin: 0.25rem 0 0; }
  .badge { display: inline-flex; align-items: center; font-size: 0.6875rem; font-weight: 700; border-radius: 999px; padding: 0.15em 0.55em; margin-left: 0.5rem; background: rgba(96,192,128,0.15); color: #60c080; }

  .sparkWrap { flex: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; min-width: 0; }
  .sparkLabel { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--crumb); margin: 0; }
  .sparklineSvg { width: 100%; height: 44px; display: block; overflow: visible; }
  .jarChange { font-size: 0.6875rem; color: var(--crumb); margin: 0.625rem 0 0; }
</style>
</head><body>
<div class="jarCard" id="card">
  <div class="jarCardTop">
    <div>
      <p class="jarLabel">YOUR JAR</p>
      <p class="jarUsd">$0.30 <span class="badge">${variant.label}</span></p>
      <p class="jarCook">3,530.6412 COOK</p>
    </div>
    <div class="sparkWrap">
      <p class="sparkLabel">Balance trend</p>
      <svg viewBox="0 0 120 40" class="sparklineSvg" aria-hidden="true" overflow="visible">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${variant.color}" stop-opacity="0.2125"/>
            <stop offset="100%" stop-color="${variant.color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${FILL_PATH}" fill="url(#sparkFill)" stroke="none"/>
        <path d="${SPARKLINE_PATH}" fill="none" stroke="${variant.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85" vector-effect="non-scaling-stroke"/>
      </svg>
    </div>
  </div>
  <p class="jarChange">Based on recent swaps</p>
</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: CHROME });

for (const variant of VARIANTS) {
  const htmlPath = resolve(OUT, `_chart_${variant.name}.html`);
  await writeFile(htmlPath, HTML(variant), "utf8");

  for (const [suffix, w] of [["desktop", 900], ["mobile", 390]]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: w, height: 400 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);

    const box = await page.$eval("#card", el => el.getBoundingClientRect().toJSON());
    const pad = 12;
    await page.screenshot({
      path: resolve(OUT, `chart-${variant.name}-${suffix}.png`),
      clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(w, box.width + pad*2), height: box.height + pad*2 },
    });
    console.log(`saved chart-${variant.name}-${suffix}.png`);
    await page.close();
  }
  await unlink(htmlPath).catch(() => {});
}

await browser.close();
