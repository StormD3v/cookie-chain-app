/**
 * Screenshots the swap panel showing the quote details divider.
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

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  :root {
    --choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;
    --crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;
    --font-body:'Inter',sans-serif;--font-mono:'JetBrains Mono',monospace;
    --font-display:'Syne',sans-serif;
    --radius-sm:6px;--radius-md:10px;--radius-lg:16px;--radius-xl:22px;
  }
  *,*::before,*::after{box-sizing:border-box;}
  body{margin:0;background:var(--choco);font-family:var(--font-body);-webkit-font-smoothing:antialiased;padding:1.5rem;}

  .panel{background:rgba(50,28,11,0.55);backdrop-filter:blur(12px);border:1px solid rgba(240,192,96,0.13);border-radius:var(--radius-xl);padding:1.25rem 1.375rem;max-width:380px;display:flex;flex-direction:column;gap:0.75rem;box-shadow:0 4px 24px rgba(0,0,0,0.35);}
  .heading{font-family:var(--font-display);font-weight:800;font-size:1.125rem;margin:0;letter-spacing:-0.03em;color:var(--cream);}
  .field{display:flex;flex-direction:column;gap:0.3rem;}
  .label{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:var(--crumb);}
  .inputRow{display:flex;background:var(--choco);border:1px solid var(--crust);border-radius:var(--radius-md);overflow:hidden;}
  .amountInput{flex:1;background:transparent;border:none;color:var(--cream);font-size:1.125rem;font-family:var(--font-mono);padding:0.625rem 0.875rem;outline:none;}
  .tokenBadge{background:var(--truffle);border-left:1px solid var(--crust);color:var(--cream);font-size:0.875rem;font-weight:700;padding:0 0.875rem;display:flex;align-items:center;}
  .flipRow{display:flex;justify-content:center;margin:-0.25rem 0;}
  .flipBtn{background:var(--truffle);border:2px solid var(--crust);border-radius:50%;color:var(--crumb);width:1.75rem;height:1.75rem;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;}

  /* Quote details — with divider */
  .quoteDetails{
    margin:0.25rem 0 0;
    background:rgba(0,0,0,0.3);
    border:1px solid var(--crust);
    border-top:1px solid rgba(240,192,96,0.1);
    border-radius:var(--radius-md);
    padding:0.75rem 0.75rem 0.5rem;
    display:flex;flex-direction:column;gap:0.3rem;
  }
  .quoteRow{display:flex;justify-content:space-between;align-items:baseline;font-size:0.75rem;}
  .quoteRow dt{color:var(--crumb);font-weight:400;}
  .quoteRow dd{margin:0;font-family:var(--font-mono);color:var(--cream);text-align:right;}

  .confirmBtn{padding:0.875rem 1rem;background:var(--butter);color:var(--choco);font-weight:700;font-size:0.9375rem;border:none;border-radius:var(--radius-md);cursor:pointer;width:100%;}
</style>
</head><body>

<div class="panel" id="panel">
  <h2 class="heading">Swap tokens</h2>

  <div class="field">
    <label class="label">You pay</label>
    <div class="inputRow">
      <input class="amountInput" value="300" readonly>
      <span class="tokenBadge">COOK</span>
    </div>
  </div>

  <div class="flipRow"><button class="flipBtn">⇅</button></div>

  <div class="field">
    <label class="label">You receive</label>
    <div class="inputRow">
      <input class="amountInput" value="227.042" readonly>
      <span class="tokenBadge">bCOOK</span>
    </div>
  </div>

  <!-- Quote details block with amber divider on top border -->
  <dl class="quoteDetails">
    <div class="quoteRow"><dt>Rate</dt><dd>1 COOK ≈ 0.7568 bCOOK</dd></div>
    <div class="quoteRow"><dt>Price impact</dt><dd>0.000%</dd></div>
    <div class="quoteRow"><dt>Minimum received</dt><dd>224.167 bCOOK</dd></div>
    <div class="quoteRow"><dt>Slippage</dt><dd>50 bps</dd></div>
    <div class="quoteRow"><dt>Route</dt><dd>CookieSwap</dd></div>
  </dl>

  <button class="confirmBtn">🔥 Bake swap</button>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_swap_divider.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });
for (const [label, w] of [["desktop", 700], ["mobile", 390]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 700 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const box = await page.$eval("#panel", el => el.getBoundingClientRect().toJSON());
  const pad = 12;
  await page.screenshot({
    path: resolve(OUT, `btn-compare-${label}.png`),
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(w, box.width + pad * 2), height: box.height + pad * 2 },
  });
  console.log(`saved btn-compare-${label}.png`);
  await page.close();
}
await browser.close();
await unlink(htmlPath).catch(() => { });
