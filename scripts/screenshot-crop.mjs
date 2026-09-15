/**
 * Cropped zoom screenshots of hero banner + swap panel areas.
 * Generates the HTML inline (no dependency on the shell script's temp file).
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
await mkdir(OUT, { recursive: true });

const assetsDir = resolve(__dirname, "../src/assets");
const assetUrl = (n) => `file:///${assetsDir.replace(/\\/g, "/")}/${n}`;
const logoDir = resolve(__dirname, "../public/logos");
const logoUrl = (n) => `file:///${logoDir.replace(/\\/g, "/")}/${n}`;

const HTML = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;--crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;--caramel:#c87820;--chip:#7c4a1e;--success:#60c080;--sky:#4a9eba;--font-display:'Syne',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono','Fira Code',monospace;--radius-xl:22px;--radius-lg:16px;--radius-md:10px;}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;}

/* Hero banner — fixed CSS matching OverviewSection.module.css */
.hero-banner{display:flex;align-items:flex-end;gap:1.25rem;padding:0 1.25rem 1.125rem 0;background:rgba(50,28,11,0.45);border:1px solid rgba(240,192,96,0.1);border-radius:var(--radius-xl);backdrop-filter:blur(10px);overflow:hidden;min-height:7rem;}
.hero-mascot{width:auto;height:9rem;object-fit:contain;flex-shrink:0;align-self:flex-end;margin-bottom:-1px;filter:drop-shadow(0 4px 16px rgba(200,120,32,0.45));}
.hero-text{min-width:0;display:flex;flex-direction:column;gap:0.25rem;padding:1rem 0 0.875rem;flex:1;}
.hero-greeting{font-family:var(--font-display);font-weight:800;font-size:1.125rem;color:var(--cream);letter-spacing:-0.02em;margin:0;white-space:normal;overflow:visible;line-height:1.25;}
.hero-sub{font-size:0.8125rem;color:var(--crumb);margin:0;}

/* Swap promo row */
.swap-card{display:flex;flex-direction:column;gap:0;}
.swap-promo-row{display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.25rem;padding:1rem 1.375rem 0.5rem;background:rgba(50,28,11,0.45);border:1px solid rgba(240,192,96,0.1);border-radius:var(--radius-xl) var(--radius-xl) 0 0;}
.swap-promo-title{font-family:var(--font-display);font-weight:800;font-size:1rem;color:var(--cream);letter-spacing:-0.02em;margin:0;}
.swap-promo-sub{font-size:0.6875rem;color:var(--crumb);margin:0.15rem 0 0;}
.swap-chef-img{width:5.5rem;height:5.5rem;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.45));}
.swap-form{background:var(--ganache);border:1px solid var(--crust);border-top:none;border-radius:0 0 var(--radius-xl) var(--radius-xl);padding:1.25rem 1.375rem;}
.swap-label{font-size:0.625rem;font-weight:700;color:var(--crumb);text-transform:uppercase;letter-spacing:0.09em;margin:0 0 0.3rem;}
.swap-input-row{display:flex;background:var(--choco);border:1px solid var(--crust);border-radius:var(--radius-md);margin-bottom:0.5rem;}
.swap-input{flex:1;background:transparent;border:none;color:var(--cream);font-size:1.25rem;padding:0.6875rem 0.875rem;outline:none;}
.swap-select{background:var(--truffle);border:none;border-left:1px solid var(--crust);border-radius:0 var(--radius-md) var(--radius-md) 0;color:var(--cream);font-size:0.9375rem;font-weight:700;padding:0 0.875rem;min-width:88px;}
.bake-btn{width:100%;padding:0.9375rem;background:var(--butter);color:var(--choco);font-weight:700;font-size:0.9375rem;border:none;border-radius:var(--radius-md);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.875rem;}

.page{padding:1.5rem;display:grid;grid-template-columns:1fr 400px;gap:1.5rem;max-width:1200px;}
.left{display:flex;flex-direction:column;gap:1.25rem;}

@media(max-width:600px){
  .page{grid-template-columns:1fr;padding:1rem;}
  .hero-mascot{height:7.5rem;}
  .hero-greeting{font-size:1rem;}
}
</style></head><body>
<div class="page">
  <div class="left">
    <!-- HERO BANNER -->
    <div class="hero-banner">
      <img src="${assetUrl("cookie-jar-hug.png")}" alt="" class="hero-mascot">
      <div class="hero-text">
        <p class="hero-greeting">Good evening, Cookie Connoisseur!</p>
        <p class="hero-sub">Your jar is full of possibilities.</p>
      </div>
    </div>
  </div>

  <!-- SWAP CARD -->
  <div class="swap-card">
    <div class="swap-promo-row">
      <div><p class="swap-promo-title">🔥 Bake a Swap</p><p class="swap-promo-sub">Trade tokens on Cookie Chain</p></div>
      <img src="${assetUrl("cooking-chef-cookie.png")}" alt="" class="swap-chef-img">
    </div>
    <div class="swap-form">
      <p class="swap-label">You pay</p>
      <div class="swap-input-row"><input class="swap-input" value="10" readonly><select class="swap-select"><option>COOK</option></select></div>
      <p class="swap-label" style="margin-top:0.5rem">You receive</p>
      <div class="swap-input-row"><input class="swap-input" value="7.570" readonly><select class="swap-select"><option>bCOOK</option></select></div>
      <button class="bake-btn">🔥 &nbsp;Bake swap</button>
    </div>
  </div>
</div>
</body></html>`;

const htmlPath = resolve(OUT, "_crop_preview.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

// Desktop: hero crop
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 700 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Hero region
  await page.screenshot({ path: resolve(OUT, "crop-hero-desktop.png"), clip: { x: 24, y: 24, width: 700, height: 200 } });
  console.log("saved crop-hero-desktop.png");

  // Swap region
  await page.screenshot({ path: resolve(OUT, "crop-swap-desktop.png"), clip: { x: 724, y: 24, width: 440, height: 380 } });
  console.log("saved crop-swap-desktop.png");

  await page.close();
}

// Mobile: hero + greeting (full width, single column)
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.screenshot({ path: resolve(OUT, "crop-hero-mobile.png"), clip: { x: 0, y: 16, width: 390, height: 175 } });
  console.log("saved crop-hero-mobile.png");

  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => { });
