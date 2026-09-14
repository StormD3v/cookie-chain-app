/**
 * Side-by-side comparison: disabled button vs enabled button vs wallet pill,
 * at desktop (1440px) and mobile (390px).
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
:root {
  --choco:#0f0c0a; --ganache:#321c0b; --truffle:#3e2612;
  --crust:#5c3c22; --crumb:#8a6848; --cream:#f5e6c8;
  --butter:#f0c060; --caramel:#c87820; --chip:#7c4a1e;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-xl:22px;
  --font-body:'Inter',system-ui,sans-serif;
  --font-display:'Syne',system-ui,sans-serif;
}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;-webkit-font-smoothing:antialiased;padding:2rem 2.5rem;}

/* Reference: wallet pill from index.css wallet-adapter overrides */
.wallet-pill {
  background: var(--butter);
  color: var(--choco);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: var(--radius-md);
  border: none;
  height: 2.375rem;
  padding: 0 1.125rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

/* Base confirm button */
.confirm-btn {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 0.9375rem;
  letter-spacing: 0.01em;
  border-radius: var(--radius-md);
  border: 2px solid rgba(240,192,96,0.55);
  height: 2.75rem;
  padding: 0 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  min-width: 200px;
}

/* Enabled */
.confirm-btn.enabled {
  background: var(--butter);
  color: var(--choco);
  box-shadow: 0 4px 20px rgba(240,192,96,0.3), 0 1px 4px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.15);
  border-color: rgba(240,192,96,0.55);
}

/* Disabled — amber wash */
.confirm-btn.disabled {
  background: color-mix(in srgb, var(--butter) 28%, var(--ganache));
  border-color: rgba(240,192,96,0.35);
  color: rgba(15,12,10,0.55);
  box-shadow: none;
  cursor: not-allowed;
}

.divider {
  display: inline-block;
  width: 1px;
  height: 1rem;
  background: rgba(15,12,10,0.35);
  border-radius: 1px;
  flex-shrink: 0;
}

/* Layout */
.row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}
.label {
  font-size: 0.6875rem;
  color: var(--crumb);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}
.col { display: flex; flex-direction: column; }

.section-label {
  font-size: 0.75rem;
  color: var(--crumb);
  margin: 0 0 1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--crust);
  padding-bottom: 0.5rem;
}
</style></head>
<body>

<p class="section-label">Wallet pill vs Bake swap — disabled vs enabled</p>

<div class="row">
  <div class="col">
    <p class="label">Wallet pill (reference)</p>
    <button class="wallet-pill">
      <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>
      Es1f…jXqC
    </button>
  </div>

  <div class="col">
    <p class="label">Disabled (no amount)</p>
    <button class="confirm-btn disabled" disabled>
      <span>🔥</span>
      <span class="divider"></span>
      Bake swap
    </button>
  </div>

  <div class="col">
    <p class="label">Enabled (amount entered)</p>
    <button class="confirm-btn enabled">
      <span>🔥</span>
      <span class="divider"></span>
      Bake swap
    </button>
  </div>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_btn_compare.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w, h] of [["btn-compare-desktop", 1440, 400], ["btn-compare-mobile", 390, 360]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const out = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
