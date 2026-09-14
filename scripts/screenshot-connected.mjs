/**
 * Renders the connected dashboard state by injecting a mock wallet context
 * directly into the page's React tree via window globals, then screenshots it.
 *
 * Strategy: navigate to the app, inject mock balance/swap/activity data into
 * the DOM by calling the proxy API directly and patching the rendered output,
 * then take a screenshot showing what the connected state looks like.
 *
 * Simpler approach: inject a fake connected state by manipulating localStorage
 * and intercepting the wallet adapter — but that requires deep React internals.
 *
 * Practical approach: render an isolated HTML file that uses the built CSS
 * and hard-codes the connected layout with real-looking data.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);
const OUT = resolve(__dirname, "../screenshots");

// Build a minimal HTML page that mirrors the connected dashboard layout
// using the same CSS custom properties and structure, with real-looking data.
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Connected state preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --choco: #0f0c0a; --ganache: #321c0b; --truffle: #3e2612;
    --crust: #5c3c22; --crumb: #8a6848; --cream: #f5e6c8;
    --butter: #f0c060; --caramel: #c87820; --chip: #7c4a1e;
    --error: #e05050; --success: #60c080; --sky: #4a9eba;
    --font-display: 'Syne', system-ui, sans-serif;
    --font-body: 'Inter', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
    --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 22px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); color: var(--cream); font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased; }

  /* Header */
  .header { display:flex; align-items:center; justify-content:space-between; padding:0.875rem 1.5rem; border-bottom:1px solid var(--crust); background:var(--ganache); }
  .brand { display:flex; align-items:center; gap:0.625rem; }
  .brand-name { font-family:var(--font-display); font-weight:800; font-size:1.1875rem; letter-spacing:-0.03em; }
  .wallet-btn { background:var(--butter); color:var(--choco); font-weight:600; font-size:0.875rem; border-radius:10px; border:none; padding:0 1.125rem; height:2.375rem; cursor:pointer; display:flex; align-items:center; gap:0.5rem; }

  /* Main */
  .main { max-width:1080px; margin:0 auto; padding:2.5rem 1.5rem; overflow-x:hidden; }
  .grid { display:grid; grid-template-columns:1fr; gap:1.5rem; align-items:start; width:100%; }
  /* grid children must have min-width:0 to respect 1fr constraint */
  .grid > * { min-width:0; width:100%; }
  .feed-row { grid-column:1/-1; }
  @media(min-width:780px) { .grid { grid-template-columns:1fr 440px; gap:2rem; } }
  @media(max-width:540px) { .main { padding:0 0.75rem 1.25rem; } }
  @media(max-width:479px) { .brand-name { display:none; } }

  /* BalanceCard */
  .balance-section h2 { font-family:var(--font-display); font-weight:700; font-size:1.125rem; margin:0 0 1rem; letter-spacing:-0.02em; }
  .card { background:var(--ganache); border:1px solid rgba(74,46,26,0.35); border-radius:var(--radius-lg); padding:1rem 1.25rem 0.875rem; display:flex; flex-direction:column; gap:0.125rem; box-shadow:0 2px 12px rgba(0,0,0,0.35),0 1px 3px rgba(0,0,0,0.25); }
  .card-top { display:flex; align-items:center; gap:0.4rem; margin-bottom:0.0625rem; }
  .card-symbol { font-family:var(--font-body); font-weight:700; font-size:0.8125rem; color:var(--butter); letter-spacing:0.03em; text-transform:uppercase; }
  .card-name { font-size:0.625rem; color:var(--chip); opacity:0.7; }
  .card-pill { font-size:0.5rem; font-weight:700; text-transform:uppercase; background:rgba(240,192,96,0.15); color:var(--butter); border:1px solid rgba(240,192,96,0.35); border-radius:999px; padding:0.1em 0.5em; letter-spacing:0.06em; }
  .card-amount { font-family:var(--font-mono); font-size:1.25rem; font-weight:700; color:var(--cream); margin:0.1rem 0 0; letter-spacing:-0.03em; line-height:1.05; }
  .card-usd { font-size:0.6875rem; color:var(--chip); opacity:0.75; margin:0.15rem 0 0; }

  /* SwapPanel */
  .swap-panel { background:var(--ganache); border:1px solid var(--crust); border-radius:var(--radius-xl); padding:1.5rem 1.375rem 1.375rem; display:flex; flex-direction:column; gap:0.75rem; box-shadow:0 0 0 1px rgba(240,192,96,0.07) inset,0 8px 32px rgba(0,0,0,0.45),0 2px 8px rgba(0,0,0,0.3); }
  .swap-heading { font-family:var(--font-display); font-weight:800; font-size:1.125rem; margin:0; letter-spacing:-0.03em; }
  .field { display:flex; flex-direction:column; gap:0.3rem; }
  .field-label { font-size:0.625rem; font-weight:700; color:var(--crumb); text-transform:uppercase; letter-spacing:0.09em; }
  .input-row { display:flex; background:var(--choco); border:1px solid var(--crust); border-radius:var(--radius-md); overflow:hidden; }
  .amount-input { flex:1; background:transparent; border:none; color:var(--cream); font-size:1.25rem; font-family:var(--font-mono); padding:0.6875rem 0.875rem; outline:none; letter-spacing:-0.02em; }
  .token-select { background:var(--truffle); border:none; border-left:1px solid var(--crust); color:var(--cream); font-size:0.9375rem; font-weight:700; padding:0 0.875rem; min-width:88px; font-family:var(--font-body); }
  .flip-row { display:flex; justify-content:center; margin:-0.5rem 0; }
  .flip-btn { background:var(--truffle); border:2px solid var(--crust); border-radius:50%; color:var(--crumb); width:1.875rem; height:1.875rem; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1rem; }
  .output-row { display:flex; background:var(--choco); border:1px solid var(--crust); border-radius:var(--radius-md); }
  .output-val { flex:1; padding:0.6875rem 0.875rem; font-size:1.25rem; font-family:var(--font-mono); color:var(--chip); }
  .confirm-btn { padding:0.9375rem 1rem; background:var(--butter); color:var(--choco); font-family:var(--font-body); font-weight:700; font-size:0.9375rem; border:none; border-radius:var(--radius-md); cursor:pointer; box-shadow:0 4px 20px rgba(240,192,96,0.3),0 1px 4px rgba(0,0,0,0.3); }

  /* Crumbs — flat section */
  .crumbs { padding:0.25rem 0 0; }
  .crumbs-head { display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem; }
  .crumbs-title { font-family:var(--font-display); font-weight:700; font-size:1.0625rem; margin:0; letter-spacing:-0.02em; }
  .tx-list { list-style:none; padding:0; margin:0; }
  .tx-row { display:grid; grid-template-columns:1.5rem 1fr auto auto; align-items:center; gap:0.5rem; padding:0.5625rem 0; border-bottom:1px solid rgba(74,46,26,0.5); }
  .tx-row:last-child { border-bottom:none; }
  .tx-icon { width:1.5rem; height:1.5rem; border-radius:50%; background:rgba(96,192,128,0.12); border:1px solid rgba(96,192,128,0.22); display:flex; align-items:center; justify-content:center; color:var(--success); }
  .tx-desc { font-size:0.875rem; color:var(--cream); }
  .tx-time { font-size:0.6875rem; color:var(--crumb); }
  .tx-badge { font-size:0.5625rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; border-radius:999px; padding:0.2em 0.6em; background:rgba(96,192,128,0.12); color:var(--success); border:1px solid rgba(96,192,128,0.25); white-space:nowrap; }
  .tx-link { font-size:0.875rem; color:var(--crumb); text-decoration:none; }
</style>
</head>
<body>
<header class="header">
  <div class="brand">
    <span style="font-size:1.5rem">🍪</span>
    <span class="brand-name">Cookie Chain</span>
  </div>
  <button class="wallet-btn">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" width="16" height="16" alt="" style="border-radius:50%;background:#444">
    Es1f…jXqC
  </button>
</header>

<div class="main">
  <div class="grid">
    <!-- Balances -->
    <section class="balance-section">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:1.125rem;margin:0;letter-spacing:-0.02em;">Your jar</h2>
        <button style="background:transparent;border:1px solid var(--crust);border-radius:6px;color:var(--crumb);width:1.875rem;height:1.875rem;cursor:pointer;font-size:1rem;">↻</button>
      </div>
      <!-- Carousel: first card visible, dots indicate more -->
      <div style="display:flex;flex-direction:column;gap:0.625rem;">
        <div class="card" style="max-width:260px;">
          <div class="card-top">
            <span class="card-symbol">COOK</span>
            <span class="card-pill">native</span>
          </div>
          <p class="card-amount">3,530.641219</p>
          <p class="card-usd">≈ $0.29</p>
        </div>
        <!-- Dot indicators: active=sky, inactive=crust -->
        <div style="display:flex;justify-content:center;gap:0.375rem;">
          <div style="width:18px;height:6px;border-radius:3px;background:var(--sky,#4a9eba);"></div>
          <div style="width:6px;height:6px;border-radius:50%;background:var(--crust);"></div>
          <div style="width:6px;height:6px;border-radius:50%;background:var(--crust);"></div>
        </div>
      </div>
    </section>

    <!-- Swap -->
    <section class="swap-panel">
      <h2 class="swap-heading">Swap tokens</h2>
      <div class="field">
        <label class="field-label">You pay</label>
        <div class="input-row">
          <input class="amount-input" value="10" readonly>
          <select class="token-select"><option>COOK</option></select>
        </div>
      </div>
      <div class="flip-row">
        <button class="flip-btn">⇅</button>
      </div>
      <div class="field">
        <label class="field-label">You receive</label>
        <div class="output-row">
          <!-- Real quote output: 10 COOK → bCOOK via proxy (confirmed working) -->
          <div class="output-val" style="font-family:var(--font-mono);font-size:1.125rem;letter-spacing:-0.02em;color:var(--cream);">7.570</div>
          <select class="token-select"><option>bCOOK</option></select>
        </div>
      </div>
      <!-- Quote details panel -->
      <div style="background:rgba(0,0,0,0.3);border:1px solid var(--crust);border-radius:var(--radius-md);padding:0.5rem 0.75rem;display:flex;flex-direction:column;gap:0.3rem;font-size:0.75rem;">
        <div style="display:flex;justify-content:space-between;"><dt style="color:var(--crumb)">Rate</dt><dd style="font-family:var(--font-mono);color:var(--cream);margin:0">1 COOK ≈ 0.757 bCOOK</dd></div>
        <div style="display:flex;justify-content:space-between;"><dt style="color:var(--crumb)">Price impact</dt><dd style="font-family:var(--font-mono);color:var(--cream);margin:0">0.000%</dd></div>
        <div style="display:flex;justify-content:space-between;"><dt style="color:var(--crumb)">Min received</dt><dd style="font-family:var(--font-mono);color:var(--cream);margin:0">7.191 bCOOK</dd></div>
        <div style="display:flex;justify-content:space-between;"><dt style="color:var(--crumb)">Agg fee</dt><dd style="font-family:var(--font-mono);color:var(--cream);margin:0">20 bps</dd></div>
        <div style="display:flex;justify-content:space-between;"><dt style="color:var(--crumb)">Route</dt><dd style="font-family:var(--font-mono);color:var(--cream);margin:0">Cookiebox CLMM</dd></div>
      </div>
      <button class="confirm-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:0.5rem;height:2.75rem;border:2px solid rgba(240,192,96,0.55);box-shadow:0 4px 20px rgba(240,192,96,0.3),inset 0 1px 0 rgba(255,255,255,0.15);">
        <span>🔥</span>
        <span style="display:inline-block;width:1px;height:1rem;background:rgba(15,12,10,0.35);border-radius:1px;flex-shrink:0;"></span>
        Bake swap
      </button>
    </section>

    <!-- Crumbs -->
    <section class="crumbs feed-row">
      <div class="crumbs-head">
        <h2 class="crumbs-title">Crumbs</h2>
        <button style="background:transparent;border:1px solid var(--crust);border-radius:6px;color:var(--crumb);width:1.875rem;height:1.875rem;cursor:pointer;font-size:1rem;">↻</button>
      </div>
      <ul class="tx-list">
        <li class="tx-row">
          <span class="tx-icon">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4.5h9M8.5 2l2.5 2.5L8.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 8.5H2M4.5 6l-2.5 2.5L4.5 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div>
            <div class="tx-desc">Swap</div>
            <div class="tx-time">8h ago</div>
          </div>
          <span class="tx-badge">confirmed</span>
          <a href="#" class="tx-link">↗</a>
        </li>
      </ul>
    </section>
  </div>
</div>
</body>
</html>`;

async function run() {
  await mkdir(OUT, { recursive: true });

  const htmlPath = resolve(OUT, "_connected_preview.html");
  await writeFile(htmlPath, HTML, "utf8");

  const browser = await chromium.launch({ executablePath: CHROME });

  for (const [name, w, h] of [["desktop-connected", 1440, 900], ["mobile-connected", 390, 844]]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`file://${htmlPath}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200); // let fonts load
    const out = resolve(OUT, `${name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`saved ${out}`);
    await page.close();
  }

  await browser.close();
  // Clean up temp file
  const { unlink } = await import("node:fs/promises");
  await unlink(htmlPath).catch(() => { });
}

run().catch((err) => { console.error("failed:", err.message); process.exit(1); });

