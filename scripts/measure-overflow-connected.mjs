/**
 * Loads the connected-state static preview and finds every overflowing element
 * at 320px, 337px, and 390px.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

// Minimal connected layout using the real CSS variables and grid/SwapPanel structure
const HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --choco:#1a0e08;--ganache:#231208;--truffle:#2e1a0e;
  --crust:#4a2e1a;--crumb:#8a6848;--cream:#f5e6c8;
  --butter:#f0c060;--caramel:#c87820;--chip:#7c4a1e;
  --radius-sm:6px;--radius-md:10px;--radius-lg:16px;--radius-xl:22px;
  --font-display:'Syne',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code',monospace;
}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;overflow-x:hidden;}
/* Main layout matching Dashboard.module.css */
.main{flex:none;display:flex;flex-direction:column;justify-content:flex-start;max-width:1080px;width:100%;margin:0 auto;padding:2.5rem 1.5rem;overflow-x:hidden;}
.grid{display:grid;grid-template-columns:1fr;gap:1.5rem;align-items:start;width:100%;}
.feed-row{grid-column:1/-1;}
@media(min-width:780px){.grid{grid-template-columns:1fr 440px;gap:2rem;}}
/* matching ≤540px override */
@media(max-width:540px){.main{padding:0 0.75rem 1.25rem;}}
/* SwapPanel — exact copy of SwapPanel.module.css */
.panel{background:var(--ganache);border:1px solid var(--crust);border-radius:var(--radius-xl);padding:1.5rem 1.375rem 1.375rem;display:flex;flex-direction:column;gap:0.75rem;width:100%;min-width:0;max-width:100%;box-sizing:border-box;position:relative;}
.panel-heading{font-family:var(--font-display);font-weight:800;font-size:1.125rem;margin:0;letter-spacing:-0.03em;}
.field{display:flex;flex-direction:column;gap:0.3rem;}
.field-label{font-size:0.625rem;font-weight:700;color:var(--crumb);text-transform:uppercase;letter-spacing:0.09em;}
.input-row{display:flex;gap:0;align-items:stretch;background:var(--choco);border:1px solid var(--crust);border-radius:var(--radius-md);}
.amount-input{flex:1;background:transparent;border:none;color:var(--cream);font-size:1.25rem;font-family:var(--font-mono);padding:0.6875rem 0.875rem;min-width:0;outline:none;letter-spacing:-0.02em;}
.token-select{background:var(--truffle);border:none;border-left:1px solid var(--crust);border-radius:0 var(--radius-md) var(--radius-md) 0;color:var(--cream);font-family:var(--font-body);font-size:0.9375rem;font-weight:700;padding:0 0.875rem 0 0.75rem;min-width:88px;appearance:none;padding-right:1.875rem;}
@media(max-width:380px){.token-select{min-width:68px;padding-right:1.5rem;font-size:0.875rem;}}
@media(max-width:480px){.panel{padding:1.25rem 1rem;border-radius:var(--radius-lg);}.amount-input{font-size:1.125rem;}}
.flip-row{display:flex;justify-content:center;margin:-0.5rem 0;position:relative;z-index:1;}
.confirm-btn{flex:1;padding:0.9375rem 1rem;background:var(--butter);color:var(--choco);font-family:var(--font-body);font-weight:700;font-size:0.9375rem;border:none;border-radius:var(--radius-md);cursor:pointer;}
.actions{display:flex;gap:0.5rem;margin-top:0.125rem;}
/* BalanceCard */
.card{background:var(--ganache);border:1px solid rgba(74,46,26,0.35);border-radius:var(--radius-lg);padding:1rem 1.25rem 0.875rem;display:flex;flex-direction:column;gap:0.125rem;}
.card-amount{font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:var(--cream);margin:0.1rem 0 0;letter-spacing:-0.03em;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* ActivityFeed */
.feed{background:transparent;border:none;padding:0.25rem 0 0;display:flex;flex-direction:column;gap:0.75rem;min-width:0;max-width:100%;}
.tx-row{display:grid;grid-template-columns:1.5rem 1fr auto auto;align-items:center;gap:0.5rem;padding:0.5625rem 0;border-bottom:1px solid rgba(74,46,26,0.5);min-width:0;max-width:100%;}
.tx-badge{font-size:0.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-radius:999px;padding:0.2em 0.6em;white-space:nowrap;background:rgba(96,192,128,0.12);color:#60c080;border:1px solid rgba(96,192,128,0.25);}
</style></head>
<body>
<div class="main">
  <div class="grid">
    <section>
      <div class="card">
        <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.0625rem">
          <span style="font-family:var(--font-body);font-weight:500;font-size:0.6875rem;color:var(--chip);letter-spacing:0.04em;text-transform:uppercase">COOK</span>
          <span style="font-size:0.625rem;color:var(--chip);opacity:0.7">Cookie (native)</span>
        </div>
        <p class="card-amount">3,530.641219</p>
        <p style="font-size:0.6875rem;color:var(--chip);opacity:0.75;margin:0.15rem 0 0">≈ $0.29</p>
      </div>
    </section>
    <section class="panel">
      <h2 class="panel-heading">Swap tokens</h2>
      <div class="field">
        <label class="field-label">You pay</label>
        <div class="input-row">
          <input class="amount-input" value="10" readonly>
          <select class="token-select"><option>COOK</option></select>
        </div>
      </div>
      <div class="flip-row"><button style="background:var(--truffle);border:2px solid var(--crust);border-radius:50%;width:1.875rem;height:1.875rem;color:var(--crumb);">⇅</button></div>
      <div class="field">
        <label class="field-label">You receive</label>
        <div class="input-row">
          <div style="flex:1;padding:0.6875rem 0.875rem;font-size:1.25rem;font-family:var(--font-mono);color:var(--chip);">—</div>
          <select class="token-select"><option>USDC</option></select>
        </div>
      </div>
      <div class="actions"><button class="confirm-btn">Bake swap 🔥</button></div>
    </section>
    <section class="feed-row feed">
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
        <h2 style="font-family:var(--font-display);font-weight:700;font-size:1.0625rem;margin:0;letter-spacing:-0.02em">Crumbs</h2>
      </div>
      <ul style="list-style:none;padding:0;margin:0">
        <li class="tx-row">
          <span style="width:1.5rem;height:1.5rem;border-radius:50%;background:rgba(96,192,128,0.12);border:1px solid rgba(96,192,128,0.22);display:flex;align-items:center;justify-content:center;color:#60c080;font-size:0.75rem;">⇄</span>
          <div><div style="font-size:0.875rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Swap</div><div style="font-size:0.6875rem;color:var(--crumb)">8h ago</div></div>
          <span class="tx-badge">confirmed</span>
          <a href="#" style="color:var(--crumb);text-decoration:none;font-size:0.875rem">↗</a>
        </li>
      </ul>
    </section>
  </div>
</div>
</body></html>`;

const htmlPath = resolve(__dirname, "../screenshots/_overflow_test.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const vw of [320, 337, 390]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  const result = await page.evaluate((vpWidth) => {
    const docSW = document.documentElement.scrollWidth;
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vpWidth + 1) {
        const tag = el.tagName.toLowerCase();
        const cls = Array.from(el.classList).slice(0, 2).join(".");
        const cs = getComputedStyle(el);
        offenders.push({
          id: `${tag}${cls ? "."+cls : ""}`,
          right: Math.round(r.right),
          width: Math.round(r.width),
          over: Math.round(r.right - vpWidth),
          minW: cs.minWidth,
          ws: cs.whiteSpace,
        });
      }
    });
    const seen = {};
    for (const o of offenders) {
      if (!seen[o.id] || seen[o.id].over < o.over) seen[o.id] = o;
    }
    return {
      docSW,
      hasScroll: docSW > vpWidth,
      top: Object.values(seen).sort((a,b)=>b.over-a.over).slice(0,6),
    };
  }, vw);

  const s = result.hasScroll ? "❌ OVERFLOW" : "✓ clean";
  console.log(`\n── ${vw}px  ${s}  docScrollWidth=${result.docSW}`);
  for (const o of result.top) {
    console.log(`   +${o.over}px  right=${o.right}  w=${o.width}  ${o.id}  minW=${o.minW}  ws=${o.ws}`);
  }
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
