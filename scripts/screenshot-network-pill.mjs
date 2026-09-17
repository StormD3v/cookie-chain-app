/**
 * Screenshots the network selector pill in both closed and open states.
 * Renders an isolated HTML page that mirrors the exact CSS from AppShell.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --choco:#0f0c0a; --ganache:#321c0b; --crust:#5c3c22; --crumb:#8a6848;
    --cream:#f5e6c8; --butter:#f0c060; --success:#60c080;
    --font-body:'Inter',system-ui,sans-serif;
    --radius-sm:6px; --radius-md:10px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }

  /* Topbar context */
  .topbar {
    display: flex; align-items: center; justify-content: flex-end;
    padding: 0.75rem 1.5rem;
    background: rgba(50,28,11,0.55);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(240,192,96,0.1);
    gap: 0.75rem; min-height: 56px;
  }

  /* Pill */
  .chainPill {
    display: flex; align-items: center; gap: 0.375rem;
    background: rgba(96,192,128,0.08);
    border: 1px solid rgba(96,192,128,0.2);
    border-radius: 999px;
    padding: 0.25rem 0.5rem 0.25rem 0.625rem;
    font-size: 0.75rem; color: var(--success); font-weight: 500;
    white-space: nowrap; cursor: pointer;
    font-family: var(--font-body);
    transition: background 0.12s, border-color 0.12s;
  }
  .chainPill.open {
    background: rgba(96,192,128,0.15);
    border-color: rgba(96,192,128,0.4);
  }
  .chainDotSm {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--success); flex-shrink: 0;
    box-shadow: 0 0 5px rgba(96,192,128,0.6);
  }
  .chevron {
    color: var(--success); opacity: 0.7; flex-shrink: 0;
    transition: transform 0.15s;
  }
  .chevron.open { transform: rotate(180deg); }

  /* Selector wrapper */
  .networkSelector { position: relative; }

  /* Dropdown */
  .networkDropdown {
    position: absolute; top: calc(100% + 0.5rem); right: 0;
    min-width: 200px;
    background: rgba(32,16,4,0.97);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(240,192,96,0.15);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35);
    padding: 0.375rem;
    z-index: 50;
  }
  .networkItem {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm);
    background: rgba(96,192,128,0.08);
  }
  .networkItemName {
    flex: 1; font-size: 0.8125rem; font-weight: 600;
    color: var(--cream); white-space: nowrap;
  }
  .networkCheck { color: var(--success); flex-shrink: 0; }
  .networkDivider {
    height: 1px; background: rgba(240,192,96,0.08); margin: 0.375rem 0;
  }
  .networkComingSoon {
    padding: 0.4rem 0.625rem 0.35rem;
    font-size: 0.6875rem; color: var(--crumb);
    white-space: nowrap; font-style: italic;
  }

  /* Wallet button mock */
  .walletBtn {
    background: var(--butter); color: var(--choco); border: none;
    border-radius: 10px; padding: 0 1rem; height: 2.25rem;
    font-family: var(--font-body); font-weight: 700; font-size: 0.8125rem;
    cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
  }
</style>
</head><body>

<!-- CLOSED state -->
<div class="topbar" id="closed">
  <div class="networkSelector">
    <button class="chainPill">
      <span class="chainDotSm"></span>
      <span>Cookie Chain</span>
      <svg class="chevron" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>
  <button class="walletBtn">🐱 Es1f…jXqC ▾</button>
</div>

<!-- OPEN state — extra height for dropdown -->
<div class="topbar" id="open" style="position:relative; margin-top:1rem; padding-bottom:9rem;">
  <div class="networkSelector">
    <button class="chainPill open">
      <span class="chainDotSm"></span>
      <span>Cookie Chain</span>
      <svg class="chevron open" width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="networkDropdown">
      <div class="networkItem">
        <span class="chainDotSm"></span>
        <span class="networkItemName">Cookie Chain</span>
        <svg class="networkCheck" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="networkDivider"></div>
      <div class="networkComingSoon">More networks coming soon</div>
    </div>
  </div>
  <button class="walletBtn">🐱 Es1f…jXqC ▾</button>
</div>

</body></html>`;

import { writeFile, unlink } from "node:fs/promises";
const htmlPath = resolve(OUT, "_network_pill.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

// Screenshot closed state
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 900, height: 300 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const box = await page.$eval("#closed", el => el.getBoundingClientRect().toJSON());
  await page.screenshot({
    path: resolve(OUT, "network-pill-closed.png"),
    clip: { x: 0, y: box.y, width: 900, height: box.height },
  });
  console.log("saved network-pill-closed.png");
  await page.close();
}

// Screenshot open state
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 900, height: 400 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const box = await page.$eval("#open", el => el.getBoundingClientRect().toJSON());
  await page.screenshot({
    path: resolve(OUT, "network-pill-open.png"),
    clip: { x: 0, y: box.y, width: 900, height: box.height + 8 },
  });
  console.log("saved network-pill-open.png");
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
