/**
 * Close-up crop of the sidebar bottom corner showing the cookie cluster.
 * Uses an inline HTML that mirrors the sidebar CSS exactly.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const assetsDir = resolve(__dirname, "../src/assets");
const assetUrl = (n) => `file:///${assetsDir.replace(/\\/g, "/")}/${n}`;

const HTML = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;--crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;--success:#60c080;--font-display:'Syne',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif;--radius-sm:6px;}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);}

.sidebar{
  width:240px;height:340px;
  background:rgba(50,28,11,0.6);backdrop-filter:blur(14px);
  border-right:1px solid var(--crust);
  display:flex;flex-direction:column;
  position:relative;overflow:hidden;
}

/* nav filler */
.nav{flex:1;padding:1rem 0.625rem;}
.nav-item{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.625rem;border-radius:var(--radius-sm);color:var(--crumb);font-family:var(--font-body);font-size:0.875rem;margin-bottom:2px;}
.nav-item.active{background:rgba(240,192,96,0.12);color:var(--butter);}

/* cluster image */
.cluster{
  position:absolute;
  bottom:0;left:0;
  width:160px;height:auto;
  object-fit:contain;object-position:bottom left;
  pointer-events:none;
  z-index:0;
}

/* footer */
.footer{
  position:relative;z-index:1;
  display:flex;align-items:center;gap:0.5rem;
  padding:0.875rem 1rem;
  border-top:1px solid rgba(240,192,96,0.06);
  flex-shrink:0;
}
.dot{width:7px;height:7px;border-radius:50%;background:var(--success);box-shadow:0 0 6px rgba(96,192,128,0.6);}
.chain-name{font-size:0.6875rem;font-weight:600;color:var(--cream);font-family:var(--font-body);}
.chain-status{font-size:0.5625rem;color:var(--success);font-family:var(--font-body);}
</style></head><body>

<div class="sidebar">
  <div class="nav" style="position:relative;z-index:1;">
    <div class="nav-item active">Overview</div>
    <div class="nav-item">Pantry</div>
    <div class="nav-item">Bake</div>
    <div class="nav-item">Bridge</div>
    <div class="nav-item">Crumbs</div>
  </div>

  <img src="${assetUrl("sidebar-cookie-cluster.png")}" alt="" class="cluster">

  <div class="footer">
    <div class="dot"></div>
    <div>
      <div class="chain-name">Cookie Chain</div>
      <div class="chain-status">Healthy</div>
    </div>
  </div>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_sidebar_crop.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 240, height: 340 });
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);

await page.screenshot({
  path: resolve(OUT, "sidebar-cluster-crop.png"),
  clip: { x: 0, y: 0, width: 240, height: 340 },
});
console.log("saved sidebar-cluster-crop.png");

await page.close();
await browser.close();
await unlink(htmlPath).catch(() => {});
