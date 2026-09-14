/**
 * Screenshots the new AppShell layout (sidebar + overview section)
 * using real CSS variables and structure matching AppShell + OverviewSection.
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
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --choco:#0f0c0a; --ganache:#321c0b; --truffle:#3e2612; --crust:#5c3c22;
  --crumb:#8a6848; --cream:#f5e6c8; --butter:#f0c060; --caramel:#c87820;
  --chip:#7c4a1e; --error:#e05050; --success:#60c080; --sky:#4a9eba;
  --font-display:'Syne',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code',monospace;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-xl:22px;
}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;-webkit-font-smoothing:antialiased;}

/* Shell */
.shell{min-height:100vh;display:flex;overflow-x:hidden;}

/* Sidebar */
.sidebar{width:240px;flex-shrink:0;display:flex;flex-direction:column;background:rgba(50,28,11,0.6);backdrop-filter:blur(14px);border-right:1px solid var(--crust);position:sticky;top:0;height:100vh;overflow-y:auto;}
.sidebar-brand{display:flex;align-items:center;gap:0.625rem;padding:1.25rem 1rem 1rem;border-bottom:1px solid rgba(240,192,96,0.08);}
.sidebar-logo{font-size:1.75rem;line-height:1;flex-shrink:0;width:2rem;text-align:center;}
.brand-text{flex:1;min-width:0;overflow:hidden;display:flex;flex-direction:column;gap:0.1rem;}
.brand-name{font-family:var(--font-display);font-weight:800;font-size:0.9375rem;letter-spacing:-0.02em;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.brand-tag{font-size:0.625rem;color:var(--crumb);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.nav{flex:1;padding:0.875rem 0.625rem 0.5rem;display:flex;flex-direction:column;gap:0.125rem;}
.nav-label{font-size:0.5625rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--chip);padding:0.25rem 0.375rem 0.375rem;margin:0;}
.nav-item{display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.5rem 0.625rem;background:transparent;border:none;border-radius:var(--radius-sm);color:var(--crumb);font-size:0.875rem;cursor:pointer;text-decoration:none;}
.nav-item.active{background:rgba(240,192,96,0.12);color:var(--butter);font-weight:600;}
.nav-spacer{height:0.75rem;}
.sidebar-footer{display:flex;align-items:center;gap:0.5rem;padding:0.875rem 1rem;border-top:1px solid rgba(240,192,96,0.06);}
.chain-dot{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 6px rgba(96,192,128,0.6);}
.chain-name{font-size:0.6875rem;font-weight:600;color:var(--cream);}
.chain-status{font-size:0.5625rem;color:var(--success);}

/* Body */
.body{flex:1;min-width:0;display:flex;flex-direction:column;overflow-x:hidden;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:0.75rem 1.5rem;border-bottom:1px solid rgba(240,192,96,0.1);background:rgba(50,28,11,0.55);backdrop-filter:blur(14px);position:sticky;top:0;z-index:10;gap:1rem;}
.chain-pill{display:flex;align-items:center;gap:0.375rem;background:rgba(96,192,128,0.08);border:1px solid rgba(96,192,128,0.2);border-radius:999px;padding:0.25rem 0.625rem;font-size:0.75rem;color:var(--success);font-weight:500;}
.wallet-btn{background:var(--butter);color:var(--choco);font-weight:600;font-size:0.875rem;border-radius:10px;border:none;padding:0 1.125rem;height:2.375rem;display:flex;align-items:center;gap:0.5rem;}

/* Content */
.content{padding:1.5rem;overflow-x:hidden;}

/* Overview 2-col */
.overview{display:grid;grid-template-columns:1fr 400px;gap:1.5rem;align-items:start;}
.left,.right{display:flex;flex-direction:column;gap:1.25rem;min-width:0;}

/* Card */
.card{background:rgba(50,28,11,0.55);backdrop-filter:blur(12px);border:1px solid rgba(240,192,96,0.13);border-radius:var(--radius-xl);padding:1.25rem 1.375rem;min-width:0;box-shadow:0 4px 24px rgba(0,0,0,0.35);}

/* Jar */
.jar-label{font-size:0.625rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--crumb);margin:0 0 0.375rem;}
.jar-usd{font-family:var(--font-display);font-size:2rem;font-weight:800;letter-spacing:-0.04em;color:var(--cream);margin:0;line-height:1;}
.jar-cook{font-family:var(--font-mono);font-size:0.8125rem;color:var(--crumb);margin:0.25rem 0 0;}
.jar-change{font-size:0.75rem;color:var(--success);margin:0.5rem 0 0;font-weight:500;}
.jar-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;}
.sparkline{width:120px;height:40px;}

/* Quick actions */
.qa-row{display:grid;grid-template-columns:repeat(4,1fr);gap:0.625rem;}
.qa-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.4rem;padding:0.875rem 0.5rem;background:rgba(50,28,11,0.55);backdrop-filter:blur(10px);border:1px solid rgba(240,192,96,0.13);border-radius:var(--radius-lg);color:var(--cream);font-size:0.75rem;cursor:pointer;}
.qa-btn.primary{background:rgba(240,192,96,0.15);border-color:rgba(240,192,96,0.35);color:var(--butter);}
.qa-btn.disabled{opacity:0.38;}
.qa-icon{width:1.375rem;height:1.375rem;display:flex;align-items:center;justify-content:center;}

/* Pantry */
.pantry-header{display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:1rem;}
.pantry-title{font-family:var(--font-display);font-size:1rem;font-weight:700;letter-spacing:-0.02em;margin:0;}
.pantry-sub{font-size:0.6875rem;color:var(--crumb);margin:0.1rem 0 0;}
.manage{background:transparent;border:none;color:var(--butter);font-size:0.75rem;font-weight:600;cursor:pointer;padding:0;}
.token-row{display:grid;grid-template-columns:2rem 1fr auto 80px auto;align-items:center;gap:0.625rem;padding:0.625rem 0;border-bottom:1px solid rgba(74,46,26,0.4);}
.token-row:last-child{border-bottom:none;}
.token-icon{font-size:1.25rem;line-height:1;text-align:center;}
.token-sym{font-weight:700;font-size:0.875rem;color:var(--butter);}
.token-name{font-size:0.625rem;color:var(--crumb);}
.token-amt{font-family:var(--font-mono);font-size:0.875rem;font-weight:600;text-align:right;}
.token-usd{font-size:0.625rem;color:var(--crumb);text-align:right;}
.alloc-wrap{display:flex;align-items:center;gap:0.375rem;}
.alloc-bar{flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;}
.alloc-fill{height:100%;background:var(--butter);border-radius:2px;}
.alloc-pct{font-size:0.625rem;color:var(--crumb);white-space:nowrap;width:2.25ch;text-align:right;}
.chevron{color:var(--crumb);}

/* Swap panel placeholder (real component in app) */
.swap-placeholder{background:rgba(50,28,11,0.55);backdrop-filter:blur(12px);border:1px solid rgba(240,192,96,0.13);border-radius:var(--radius-xl);padding:1.5rem 1.375rem;box-shadow:0 0 0 1px rgba(240,192,96,0.09) inset,0 8px 32px rgba(0,0,0,0.55);}
.swap-title{font-family:var(--font-display);font-weight:800;font-size:1.125rem;margin:0 0 0.875rem;letter-spacing:-0.03em;}
.swap-label{font-size:0.625rem;font-weight:700;color:var(--crumb);text-transform:uppercase;letter-spacing:0.09em;margin:0 0 0.3rem;}
.swap-input-row{display:flex;background:var(--choco);border:1px solid var(--crust);border-radius:var(--radius-md);margin-bottom:0.5rem;}
.swap-input{flex:1;background:transparent;border:none;color:var(--cream);font-size:1.25rem;font-family:var(--font-mono);padding:0.6875rem 0.875rem;outline:none;}
.swap-select{background:var(--truffle);border:none;border-left:1px solid var(--crust);border-radius:0 var(--radius-md) var(--radius-md) 0;color:var(--cream);font-size:0.9375rem;font-weight:700;padding:0 0.875rem;min-width:88px;}
.swap-flip{display:flex;justify-content:center;margin:-0.25rem 0;}
.swap-flip-btn{background:var(--truffle);border:2px solid var(--crust);border-radius:50%;color:var(--crumb);width:1.875rem;height:1.875rem;display:flex;align-items:center;justify-content:center;font-size:1rem;}
.bake-btn{width:100%;padding:0.9375rem;background:var(--butter);color:var(--choco);font-weight:700;font-size:0.9375rem;border:2px solid rgba(240,192,96,0.55);border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;box-shadow:0 4px 20px rgba(240,192,96,0.3);margin-top:0.875rem;}

/* Crumbs */
.crumbs-header{display:flex;align-items:flex-start;justify-content:space-between;gap:0.5rem;margin-bottom:0.875rem;}
.crumbs-title{font-family:var(--font-display);font-size:1rem;font-weight:700;letter-spacing:-0.02em;margin:0;}
.crumb-row{display:grid;grid-template-columns:1.5rem 1fr auto auto auto;align-items:center;gap:0.5rem;padding:0.5625rem 0;border-bottom:1px solid rgba(74,46,26,0.4);}
.crumb-row:last-child{border-bottom:none;}
.crumb-icon{width:1.5rem;height:1.5rem;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(74,158,186,0.12);color:var(--sky);border:1px solid rgba(74,158,186,0.22);}
.crumb-icon.fail{background:rgba(224,80,80,0.1);color:var(--error);border-color:rgba(224,80,80,0.2);}
.crumb-desc{font-size:0.8125rem;color:var(--cream);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.crumb-amt{font-size:0.6rem;color:var(--butter);font-family:var(--font-mono);opacity:0.85;}
.crumb-time{font-size:0.6875rem;color:var(--crumb);white-space:nowrap;}
.crumb-badge{font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;border-radius:999px;padding:0.2em 0.55em;background:rgba(74,158,186,0.14);color:var(--sky);border:1px solid rgba(74,158,186,0.3);white-space:nowrap;}
.crumb-badge.fail{background:rgba(224,80,80,0.1);color:var(--error);border-color:rgba(224,80,80,0.2);}
/* Mobile responsive */
@media (max-width: 780px) {
  .sidebar { display: none !important; }
  .overview { grid-template-columns: 1fr !important; }
  .content { padding: 1rem 0.875rem 5rem !important; }
  .topbar { padding: 0.625rem 0.875rem !important; }
}
</style></head>
<body>
<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="sidebar-logo">🍪</div>
      <div class="brand-text"><div class="brand-name">Cookie Chain</div><div class="brand-tag">Your on-chain kitchen.</div></div>
    </div>
    <nav class="nav">
      <p class="nav-label">Main</p>
      <a class="nav-item active" href="#">🏠 &nbsp;Overview</a>
      <a class="nav-item" href="#">🗄 &nbsp;Pantry</a>
      <a class="nav-item" href="#">🔥 &nbsp;Bake</a>
      <a class="nav-item" href="#">🌉 &nbsp;Bridge ↗</a>
      <a class="nav-item" href="#">📋 &nbsp;Crumbs</a>
      <div class="nav-spacer"></div>
      <p class="nav-label">Extras</p>
      <a class="nav-item" href="#">🔍 &nbsp;Explore ↗</a>
    </nav>
    <div class="sidebar-footer">
      <div class="chain-dot"></div>
      <div><div class="chain-name">Cookie Chain</div><div class="chain-status">Healthy</div></div>
    </div>
  </aside>

  <!-- Main body -->
  <div class="body">
    <header class="topbar">
      <div style="display:flex;align-items:center;gap:0.5rem;"></div>
      <div style="display:flex;align-items:center;gap:0.75rem;">
        <div class="chain-pill"><div class="chain-dot" style="width:6px;height:6px;"></div>Cookie Chain</div>
        <button class="wallet-btn">🐺 &nbsp;Es1f…jXqC</button>
      </div>
    </header>

    <div class="content">
      <div class="overview">
        <!-- Left column -->
        <div class="left">
          <!-- Portfolio jar -->
          <div class="card">
            <div class="jar-top">
              <div>
                <p class="jar-label">YOUR JAR</p>
                <p class="jar-usd">$0.30</p>
                <p class="jar-cook">3,530.6412 COOK</p>
              </div>
              <svg class="sparkline" viewBox="0 0 120 40">
                <polyline points="0,35 15,28 30,30 45,20 60,22 75,15 90,18 105,10 120,12"
                  fill="none" stroke="#f0c060" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
              </svg>
            </div>
            <p class="jar-change">+0.00% Today</p>
          </div>

          <!-- Quick actions -->
          <div class="qa-row">
            <button class="qa-btn disabled">
              <div class="qa-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 16L16 4M16 4H8M16 4v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              Send
            </button>
            <button class="qa-btn">
              <div class="qa-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16 4L4 16M4 16h8M4 16V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              Receive
            </button>
            <button class="qa-btn primary">
              <div class="qa-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 7h14M14 3l3 4-3 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 13H3M6 17l-3-4 3-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              Bake Swap
            </button>
            <button class="qa-btn">
              <div class="qa-icon"><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 14c0-4.42 3.58-8 8-8 2.21 0 4.21.9 5.66 2.34" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M18 14c0-4.42-3.58-8-8-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2 14h16M5 14v2M10 14v2M15 14v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>
              Bridge
            </button>
          </div>

          <!-- Pantry -->
          <div class="card">
            <div class="pantry-header">
              <div><div class="pantry-title">Your Pantry</div><div class="pantry-sub">All your tokens in one place</div></div>
              <button class="manage">Manage →</button>
            </div>
            <div class="token-row"><span class="token-icon">🍪</span><div><div class="token-sym">COOK</div><div class="token-name">Cookie (Native)</div></div><div><div class="token-amt">3,530.6412</div><div class="token-usd">$0.29</div></div><div class="alloc-wrap"><div class="alloc-bar"><div class="alloc-fill" style="width:72%"></div></div><span class="alloc-pct">72%</span></div><span class="chevron">›</span></div>
            <div class="token-row"><span class="token-icon">🔥</span><div><div class="token-sym">bCOOK</div><div class="token-name">bakedCOOK</div></div><div><div class="token-amt">75.6104</div><div class="token-usd">$0.007</div></div><div class="alloc-wrap"><div class="alloc-bar"><div class="alloc-fill" style="width:25%"></div></div><span class="alloc-pct">25%</span></div><span class="chevron">›</span></div>
            <div class="token-row"><span class="token-icon">💬</span><div><div class="token-sym">CHAT</div><div class="token-name">Cookie Chat</div></div><div><div class="token-amt">5,926.56</div><div class="token-usd">$0.007</div></div><div class="alloc-wrap"><div class="alloc-bar"><div class="alloc-fill" style="width:3%"></div></div><span class="alloc-pct">&nbsp;3%</span></div><span class="chevron">›</span></div>
          </div>
        </div>

        <!-- Right column -->
        <div class="right">
          <!-- Swap panel -->
          <div class="swap-placeholder">
            <div class="swap-title">🔥 &nbsp;Bake Swap</div>
            <p class="swap-label">You pay</p>
            <div class="swap-input-row"><input class="swap-input" value="10" readonly><select class="swap-select"><option>COOK</option></select></div>
            <div class="swap-flip"><button class="swap-flip-btn">⇅</button></div>
            <p class="swap-label" style="margin-top:0.5rem">You receive</p>
            <div class="swap-input-row"><input class="swap-input" value="7.570" readonly><select class="swap-select"><option>bCOOK</option></select></div>
            <button class="bake-btn">🔥 &nbsp;Bake swap</button>
          </div>

          <!-- Crumbs -->
          <div class="card">
            <div class="crumbs-header">
              <div><div class="crumbs-title">Crumbs</div><div class="pantry-sub">Your recent transactions</div></div>
              <button class="manage">View all →</button>
            </div>
            <div class="crumb-row"><div class="crumb-icon"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 4.5h9M8.5 2l2.5 2.5L8.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 8.5H2M4.5 6l-2.5 2.5L4.5 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><div class="crumb-desc">Swap</div><div class="crumb-amt">10 COOK → 7.570 bCOOK</div></div><span class="crumb-time">8h ago</span><span class="crumb-badge">Confirmed</span><a href="#" style="color:var(--crumb);text-decoration:none;font-size:0.875rem;">↗</a></div>
            <div class="crumb-row"><div class="crumb-icon" style="background:rgba(74,158,186,0.12);color:var(--sky);border-color:rgba(74,158,186,0.22)"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="4" width="3.5" height="3.5" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="8.5" y="5.5" width="3.5" height="3.5" rx="1" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 5.75h4M7 4.25l1.5 1.5L7 7.25" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div><div class="crumb-desc">Bridge</div><div class="crumb-amt">3,530 COOK</div></div><span class="crumb-time">1d ago</span><span class="crumb-badge">Confirmed</span><a href="#" style="color:var(--crumb);text-decoration:none;font-size:0.875rem;">↗</a></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const htmlPath = resolve(OUT, "_shell_preview.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w, h] of [["shell-desktop", 1440, 900], ["shell-mobile", 390, 844]]) {
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
await unlink(htmlPath).catch(() => { });
