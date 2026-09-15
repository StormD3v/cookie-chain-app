/**
 * Close-up crop of the jar card only — shows real chart size and pct badge.
 * Uses a self-contained HTML that mirrors the updated CSS exactly.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

// Smoothed sparkline path (realistic multi-swap shape)
const SPARKLINE = "M 0.00,32.00 C 15.00,32.00 15.00,28.00 30.00,28.00 C 38.00,28.00 37.00,35.00 45.00,35.00 C 53.00,35.00 52.00,18.00 60.00,18.00 C 68.00,18.00 67.00,22.00 75.00,22.00 C 83.00,22.00 82.00,10.00 90.00,10.00 C 98.00,10.00 105.00,14.00 120.00,12.00";

const HTML = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;--crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;--success:#60c080;--error:#e05050;--font-display:'Syne',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--radius-xl:22px;}
*,*::before,*::after{box-sizing:border-box;}
body{margin:2rem;background:var(--choco);color:var(--cream);font-family:var(--font-body);}

/* card shell */
.jar-card{background:rgba(50,28,11,0.55);backdrop-filter:blur(12px);border:1px solid rgba(240,192,96,0.13);border-radius:var(--radius-xl);padding:1.25rem 1.375rem;box-shadow:0 4px 24px rgba(0,0,0,0.35);width:560px;}

/* jarCardTop — flex, stretch height so chart fills */
.top{display:flex;align-items:stretch;justify-content:space-between;gap:1rem;min-height:5rem;}

/* left: balance text */
.bal{display:flex;flex-direction:column;gap:0;}
.label-row{display:flex;align-items:center;gap:0.375rem;margin-bottom:0.375rem;}
.lbl{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--crumb);margin:0;}
.eye{background:transparent;border:none;padding:0;cursor:pointer;color:var(--crumb);display:flex;align-items:center;}
.usd-row{display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;}
.usd{font-family:var(--font-display);font-size:2rem;font-weight:800;letter-spacing:-0.04em;color:var(--cream);margin:0;line-height:1;}
.badge{display:inline-flex;align-items:center;font-size:0.6875rem;font-weight:700;border-radius:999px;padding:0.15em 0.55em;white-space:nowrap;}
.badge-pos{background:rgba(96,192,128,0.15);color:var(--success);border:1px solid rgba(96,192,128,0.3);}
.badge-neg{background:rgba(224,80,80,0.12);color:var(--error);border:1px solid rgba(224,80,80,0.25);}
.cook{font-family:var(--font-mono);font-size:0.8125rem;color:var(--crumb);margin:0.25rem 0 0;}

/* right: sparkline — flex:1 fills remaining width */
.chart{flex:1;min-width:0;min-height:70px;display:flex;flex-direction:column;align-items:stretch;gap:2px;padding-top:0.25rem;}
.chart-lbl{font-size:0.5rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--crumb);margin:0;opacity:0.7;text-align:right;}
.chart svg{flex:1;width:100%;min-height:60px;overflow:visible;}

.change{font-size:0.6875rem;color:var(--crumb);margin:0.5rem 0 0;opacity:0.7;}
</style></head><body>

<div class="jar-card">
  <div class="top">
    <div class="bal">
      <div class="label-row">
        <p class="lbl">YOUR JAR</p>
        <button class="eye" aria-label="Hide balance">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7s2-4.5 6-4.5S13 7 13 7s-2 4.5-6 4.5S1 7 1 7Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="7" cy="7" r="1.75" stroke="currentColor" stroke-width="1.3"/></svg>
        </button>
      </div>
      <div class="usd-row">
        <p class="usd">$0.30</p>
        <span class="badge badge-pos">+2.3%</span>
      </div>
      <p class="cook">3,530.6412 COOK</p>
    </div>
    <div class="chart">
      <p class="chart-lbl">Balance trend</p>
      <svg viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="${SPARKLINE}" fill="none" stroke="#f0c060" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.85"
          vector-effect="non-scaling-stroke"/>
      </svg>
    </div>
  </div>
  <p class="change">Based on recent swaps</p>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_jar_card.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

// Desktop crop — just the card
const page = await browser.newPage();
await page.setViewportSize({ width: 640, height: 300 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.screenshot({
  path: resolve(OUT, "jar-card-desktop.png"),
  clip: { x: 0, y: 0, width: 640, height: 300 },
});
console.log("saved jar-card-desktop.png");

// Mobile crop — narrower card
await page.setViewportSize({ width: 390, height: 240 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({
  path: resolve(OUT, "jar-card-mobile.png"),
  clip: { x: 0, y: 0, width: 390, height: 240 },
});
console.log("saved jar-card-mobile.png");

await page.close();
await browser.close();
await unlink(htmlPath).catch(() => {});
