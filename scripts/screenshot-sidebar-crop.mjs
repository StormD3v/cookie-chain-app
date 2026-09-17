/**
 * Before/after screenshots of the sidebar bottom status area.
 * Renders a static HTML mock matching the exact CSS, with the
 * cookie-cluster image loaded via file:// URL.
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

const assetDir = resolve(__dirname, "../src/assets").replace(/\\/g, "/");
const clusterUrl = `file:///${assetDir}/sidebar-cookie-cluster.png`;

const makeHTML = (variant) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --choco:#0f0c0a;--ganache:#321c0b;--crust:#5c3c22;--crumb:#8a6848;
    --cream:#f5e6c8;--butter:#f0c060;--success:#60c080;
    --font-body:'Inter',sans-serif;--font-display:'Syne',sans-serif;
    --radius-sm:6px;--radius-lg:16px;--radius-xl:22px;
  }
  *,*::before,*::after{box-sizing:border-box;}
  body{margin:0;background:var(--choco);font-family:var(--font-body);}

  .sidebar{
    width:240px;height:320px;
    background:rgba(50,28,11,0.6);
    position:relative;overflow:hidden;
    display:flex;flex-direction:column;
  }
  .navFiller{flex:1;}

  /* Cluster image — matches AppShell.module.css exactly */
  .cluster{
    position:absolute;bottom:0;left:0;
    width:160px;height:auto;
    object-fit:contain;object-position:bottom left;
    pointer-events:none;z-index:0;
  }

  /* Footer wrapper — z-index:1, gradient covers cluster */
  .footer{
    position:relative;z-index:1;
    flex-shrink:0;
    padding-top:2.5rem;
    /* Same gradient as .sidebarFooter */
    background:linear-gradient(to bottom,
      transparent 0%,
      rgba(32,16,4,0.92) 35%,
      rgba(32,16,4,0.97) 100%);
    ${variant === "after" ? `
    padding:2.5rem 0.75rem 0.875rem;
    ` : `
    display:flex;align-items:center;gap:0.5rem;
    padding:0.875rem 1rem;
    border-top:1px solid rgba(240,192,96,0.06);
    `}
  }

  /* BEFORE: plain text layout */
  .dot{width:7px;height:7px;border-radius:50%;background:var(--success);flex-shrink:0;box-shadow:0 0 6px rgba(96,192,128,0.6);}
  .info{display:flex;flex-direction:column;gap:0.05rem;}
  .chainName{font-size:0.6875rem;font-weight:600;color:var(--cream);white-space:nowrap;}
  .chainStatus{font-size:0.5625rem;color:var(--success);white-space:nowrap;}

  /* AFTER: card wrapper */
  .statusCard{
    display:flex;align-items:center;gap:0.5rem;
    padding:0.625rem 0.75rem;
    background:rgba(50,28,11,0.55);
    backdrop-filter:blur(12px);
    border:1px solid rgba(240,192,96,0.13);
    border-radius:var(--radius-lg);
    box-shadow:0 2px 12px rgba(0,0,0,0.3);
  }

  .label{
    font-size:0.5625rem;font-weight:700;text-transform:uppercase;
    letter-spacing:0.08em;color:var(--crumb);
    padding:0 0.25rem 0.375rem;margin:0;
  }
</style>
</head><body>
<div class="sidebar" id="sidebar">
  <div class="navFiller"></div>
  <img src="${clusterUrl}" class="cluster" alt="">
  <div class="footer">
    ${variant === "before" ? `
      <span class="dot"></span>
      <div class="info">
        <span class="chainName">Cookie Chain</span>
        <span class="chainStatus">Healthy</span>
      </div>
    ` : `
      <div class="statusCard">
        <span class="dot"></span>
        <div class="info">
          <span class="chainName">Cookie Chain</span>
          <span class="chainStatus">Healthy</span>
        </div>
      </div>
    `}
  </div>
</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: CHROME });

for (const variant of ["before", "after"]) {
  const htmlPath = resolve(OUT, `_sidebar_${variant}.html`);
  await writeFile(htmlPath, makeHTML(variant), "utf8");

  const page = await browser.newPage();
  await page.setViewportSize({ width: 240, height: 320 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.screenshot({
    path: resolve(OUT, `sidebar-${variant}.png`),
    clip: { x: 0, y: 0, width: 240, height: 320 },
  });
  console.log(`saved sidebar-${variant}.png`);
  await page.close();
  await unlink(htmlPath).catch(() => { });
}

await browser.close();
