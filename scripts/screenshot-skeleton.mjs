/**
 * Renders the skeleton loading state for BalanceCard and ActivityFeed
 * using the real CSS variables and skeleton CSS classes, then screenshots.
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
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --choco:#0f0c0a; --ganache:#321c0b; --truffle:#3e2612;
  --crust:#5c3c22; --crumb:#8a6848; --cream:#f5e6c8;
  --butter:#f0c060; --caramel:#c87820; --chip:#7c4a1e;
  --error:#e05050; --success:#60c080;
  --font-display:'Syne',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code',monospace;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-xl:22px;
}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;-webkit-font-smoothing:antialiased;}

/* ── Skeleton shimmer (mirrors index.css) ── */
.skeleton{background:var(--truffle);border-radius:4px;position:relative;overflow:hidden;color:transparent;user-select:none;}
.skeleton::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 40%,rgba(255,255,255,0.13) 50%,rgba(255,255,255,0.07) 60%,transparent 100%);background-size:200% 100%;animation:shimmer 1.6s ease-in-out infinite;}
@keyframes shimmer{0%{background-position:200% center;}100%{background-position:-200% center;}}

/* Layout */
.main{max-width:1080px;margin:0 auto;padding:2.5rem 1.5rem;overflow-x:hidden;}
.grid{display:grid;grid-template-columns:1fr;gap:1.5rem;align-items:start;width:100%;}
.grid>*{min-width:0;width:100%;}
.feed-row{grid-column:1/-1;}
@media(min-width:780px){.grid{grid-template-columns:1fr 440px;gap:2rem;}}
@media(max-width:540px){.main{padding:0 0.75rem 1.25rem;}}

/* Header */
.header{display:flex;align-items:center;justify-content:space-between;padding:0.875rem 1.5rem;border-bottom:1px solid var(--crust);background:var(--ganache);}
.brand{display:flex;align-items:center;gap:0.625rem;}
.brand-name{font-family:var(--font-display);font-weight:800;font-size:1.1875rem;letter-spacing:-0.03em;}
.wallet-btn{background:var(--butter);color:var(--choco);font-weight:600;font-size:0.875rem;border-radius:10px;border:none;padding:0 1.125rem;height:2.375rem;display:flex;align-items:center;gap:0.5rem;}

/* ── BalanceCard skeleton ── */
.skel-card{background:var(--ganache);border:1px solid rgba(74,46,26,0.35);border-radius:var(--radius-lg);padding:1rem 1.25rem 0.875rem;display:flex;flex-direction:column;gap:0.375rem;box-shadow:0 2px 12px rgba(0,0,0,0.4),0 1px 3px rgba(0,0,0,0.3);}
.skel-row{display:flex;align-items:center;gap:0.4rem;margin-bottom:0.125rem;}
.skel-label{display:block;height:10px;width:44px;border-radius:3px;}
.skel-pill{display:block;height:10px;width:28px;border-radius:999px;}
.skel-amount{display:block;height:19px;width:130px;border-radius:4px;background:var(--truffle);}
.skel-usd{display:block;height:10px;width:40px;border-radius:3px;opacity:0.7;}

/* TokenBalances wrap */
.tb-wrap{display:flex;flex-direction:column;gap:1rem;}
.tb-head{display:flex;align-items:center;gap:0.75rem;}
.tb-heading{font-family:var(--font-display);font-weight:700;font-size:1.125rem;margin:0;letter-spacing:-0.02em;}
.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(185px,1fr));gap:0.75rem;list-style:none;padding:0;margin:0;}

/* ── ActivityFeed flat section ── */
.feed{background:transparent;border:none;padding:0.25rem 0 0;display:flex;flex-direction:column;gap:0.75rem;min-width:0;max-width:100%;}
.feed-head{display:flex;align-items:center;gap:0.75rem;margin-bottom:0;}
.feed-heading{font-family:var(--font-display);font-weight:700;font-size:1.0625rem;margin:0;letter-spacing:-0.02em;flex:1;}
.skel-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;}

/* Skeleton rows match real .row grid */
.skel-row-item{display:grid;grid-template-columns:1.5rem 1fr auto auto;align-items:center;gap:0.5rem;padding:0.5625rem 0;border-bottom:1px solid rgba(74,46,26,0.5);min-width:0;max-width:100%;}
.skel-row-item:last-child{border-bottom:none;}
.skel-icon{display:block;width:1.5rem;height:1.5rem;border-radius:50%;flex-shrink:0;}
.skel-body{display:flex;flex-direction:column;gap:0.25rem;min-width:0;overflow:hidden;}
.skel-desc{display:block;height:12px;width:60%;border-radius:3px;}
.skel-time{display:block;height:9px;width:35%;border-radius:3px;opacity:0.6;}
.skel-badge{display:block;height:14px;width:52px;border-radius:999px;flex-shrink:0;}
.skel-link{display:block;width:1.25rem;height:1.25rem;border-radius:var(--radius-sm);flex-shrink:0;opacity:0.5;}

/* Staggered shimmer */
.skel-row-item:nth-child(2) .skel-icon,
.skel-row-item:nth-child(2) .skel-desc,
.skel-row-item:nth-child(2) .skel-time,
.skel-row-item:nth-child(2) .skel-badge,
.skel-row-item:nth-child(2) .skel-link{animation-delay:0.2s;}
.skel-row-item:nth-child(3) .skel-icon,
.skel-row-item:nth-child(3) .skel-desc,
.skel-row-item:nth-child(3) .skel-time,
.skel-row-item:nth-child(3) .skel-badge,
.skel-row-item:nth-child(3) .skel-link{animation-delay:0.4s;}

/* SwapPanel — real styling (not loading) */
.panel{background:var(--ganache);border:1px solid var(--crust);border-radius:var(--radius-xl);padding:1.5rem 1.375rem 1.375rem;display:flex;flex-direction:column;gap:0.75rem;width:100%;min-width:0;max-width:100%;box-shadow:0 0 0 1px rgba(240,192,96,0.09) inset,0 8px 32px rgba(0,0,0,0.55),0 2px 8px rgba(0,0,0,0.4);}
.panel-heading{font-family:var(--font-display);font-weight:800;font-size:1.125rem;margin:0;letter-spacing:-0.03em;}
.field{display:flex;flex-direction:column;gap:0.3rem;}
.field-label{font-size:0.625rem;font-weight:700;color:var(--crumb);text-transform:uppercase;letter-spacing:0.09em;}
.input-row{display:flex;background:var(--choco);border:1px solid var(--crust);border-radius:var(--radius-md);}
.amount-input{flex:1;background:transparent;border:none;color:var(--cream);font-size:1.25rem;font-family:var(--font-mono);padding:0.6875rem 0.875rem;min-width:0;outline:none;letter-spacing:-0.02em;}
.token-sel{background:var(--truffle);border:none;border-left:1px solid var(--crust);border-radius:0 var(--radius-md) var(--radius-md) 0;color:var(--cream);font-size:0.9375rem;font-weight:700;padding:0 0.875rem;min-width:88px;font-family:var(--font-body);}
.flip-row{display:flex;justify-content:center;margin:-0.5rem 0;}
.confirm-btn{padding:0.9375rem 1rem;background:var(--butter);color:var(--choco);font-family:var(--font-body);font-weight:700;font-size:0.9375rem;border:none;border-radius:var(--radius-md);cursor:pointer;width:100%;box-shadow:0 4px 20px rgba(240,192,96,0.3);}
</style></head>
<body>
<header class="header">
  <div class="brand"><span style="font-size:1.5rem">🍪</span><span class="brand-name">Cookie Chain</span></div>
  <button class="wallet-btn">Es1f…jXqC</button>
</header>
<div class="main">
  <div class="grid">

    <!-- BalanceCard skeleton -->
    <section>
      <div class="tb-wrap">
        <div class="tb-head"><h2 class="tb-heading">Your jar</h2></div>
        <ul class="card-grid">
          <li>
            <div class="skel-card">
              <div class="skel-row">
                <span class="skeleton skel-label"></span>
                <span class="skeleton skel-pill"></span>
              </div>
              <span class="skeleton skel-amount"></span>
              <span class="skeleton skel-usd"></span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <!-- SwapPanel (loaded, not skeleton) -->
    <section class="panel">
      <h2 class="panel-heading">Swap tokens</h2>
      <div class="field">
        <label class="field-label">You pay</label>
        <div class="input-row">
          <input class="amount-input" value="" placeholder="0.00" readonly>
          <select class="token-sel"><option>COOK</option></select>
        </div>
      </div>
      <div class="flip-row"><button style="background:var(--truffle);border:2px solid var(--crust);border-radius:50%;width:1.875rem;height:1.875rem;color:var(--crumb);">⇅</button></div>
      <div class="field">
        <label class="field-label">You receive</label>
        <div class="input-row">
          <div style="flex:1;padding:0.6875rem 0.875rem;font-size:1.25rem;font-family:var(--font-mono);color:var(--chip);">—</div>
          <select class="token-sel"><option>USDC</option></select>
        </div>
      </div>
      <button class="confirm-btn">Bake swap 🔥</button>
    </section>

    <!-- ActivityFeed skeleton -->
    <section class="feed feed-row">
      <div class="feed-head"><h2 class="feed-heading">Crumbs</h2></div>
      <ul class="skel-list">
        <li class="skel-row-item">
          <span class="skeleton skel-icon"></span>
          <div class="skel-body"><span class="skeleton skel-desc"></span><span class="skeleton skel-time"></span></div>
          <span class="skeleton skel-badge"></span>
          <span class="skeleton skel-link"></span>
        </li>
        <li class="skel-row-item">
          <span class="skeleton skel-icon"></span>
          <div class="skel-body"><span class="skeleton skel-desc"></span><span class="skeleton skel-time"></span></div>
          <span class="skeleton skel-badge"></span>
          <span class="skeleton skel-link"></span>
        </li>
        <li class="skel-row-item">
          <span class="skeleton skel-icon"></span>
          <div class="skel-body"><span class="skeleton skel-desc"></span><span class="skeleton skel-time"></span></div>
          <span class="skeleton skel-badge"></span>
          <span class="skeleton skel-link"></span>
        </li>
      </ul>
    </section>

  </div>
</div>
</body></html>`;

const htmlPath = resolve(OUT, "_skeleton_preview.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w, h] of [["skeleton-desktop", 1440, 900], ["skeleton-mobile", 390, 844]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const out = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
