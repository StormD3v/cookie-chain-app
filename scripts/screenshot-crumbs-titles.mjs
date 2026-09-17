/**
 * Before/after comparison of Crumbs row titles.
 * Before: "Token transfer: 300" with "300 CHAT" subtitle = duplicate amount
 * After:  "Token transfer" with "300 CHAT" subtitle = clean
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

const makeHTML = (before) => `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  :root { --choco:#0f0c0a; --ganache:#321c0b; --crust:#5c3c22; --crumb:#8a6848; --cream:#f5e6c8; --butter:#f0c060; --success:#60c080; --error:#e05050; --font-body:'Inter',sans-serif; --font-mono:'JetBrains Mono',monospace; --radius-xl:22px; --radius-sm:6px; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); font-family: var(--font-body); -webkit-font-smoothing: antialiased; padding: 1.25rem; }

  .card { background: rgba(50,28,11,0.55); backdrop-filter: blur(12px); border: 1px solid rgba(240,192,96,0.13); border-radius: var(--radius-xl); padding: 1rem 1.25rem; max-width: 480px; }
  .heading { font-size: 0.9375rem; font-weight: 700; color: var(--cream); margin: 0 0 0.875rem; }
  .label { font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--crumb); margin: 0 0 0.5rem; }
  .list { list-style: none; padding: 0; margin: 0; }
  .row { display: grid; grid-template-columns: 1.75rem 1fr auto auto; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid rgba(240,192,96,0.06); }
  .row:last-child { border-bottom: none; }
  .icon { width: 1.75rem; height: 1.75rem; border-radius: 50%; background: rgba(96,192,128,0.1); border: 1px solid rgba(96,192,128,0.2); display: flex; align-items: center; justify-content: center; color: var(--success); flex-shrink: 0; }
  .icon.send { background: rgba(240,192,96,0.08); border-color: rgba(240,192,96,0.18); color: var(--butter); }
  .body { min-width: 0; }
  .desc { font-size: 0.8125rem; color: var(--cream); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .amt { font-family: var(--font-mono); font-size: 0.6875rem; color: var(--crumb); display: block; margin-top: 0.1rem; }
  .badge { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 999px; padding: 0.15em 0.5em; background: rgba(96,192,128,0.12); color: var(--success); border: 1px solid rgba(96,192,128,0.22); white-space: nowrap; }
  .time { font-size: 0.625rem; color: var(--crumb); white-space: nowrap; }
</style>
</head><body>
<div class="card" id="card">
  <p class="heading">Crumbs</p>
  <p class="label">${before ? "Before — amount duplicated in title" : "After — clean title"}</p>
  <ul class="list">
    <li class="row">
      <span class="icon">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M2 4.5h9M8.5 2l2.5 2.5L8.5 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 8.5H2M4.5 6l-2.5 2.5L4.5 11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="body">
        <span class="desc">Swap</span>
        <span class="amt">−1,000 COOK +0.013 USDC</span>
      </div>
      <span class="badge">Confirmed</span>
      <span class="time">2m ago</span>
    </li>
    <li class="row">
      <span class="icon send">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M10 3L3 10M3 10h5M3 10V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="body">
        <span class="desc">${before ? "Token transfer: 300" : "Token transfer"}</span>
        <span class="amt">300 CHAT</span>
      </div>
      <span class="badge">Confirmed</span>
      <span class="time">16h ago</span>
    </li>
    <li class="row">
      <span class="icon send">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M10 3L3 10M3 10h5M3 10V5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="body">
        <span class="desc">${before ? "Token transfer: 5" : "Token transfer"}</span>
        <span class="amt">5 bCOOK</span>
      </div>
      <span class="badge">Confirmed</span>
      <span class="time">16h ago</span>
    </li>
    <li class="row">
      <span class="icon">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M3 10L10 3M10 3H5M10 3v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="body">
        <span class="desc">${before ? "Token transfer: 10" : "Token transfer"}</span>
        <span class="amt">+10 COOK</span>
      </div>
      <span class="badge">Confirmed</span>
      <span class="time">16h ago</span>
    </li>
    <li class="row">
      <span class="icon" style="background:rgba(224,80,80,0.08);border-color:rgba(224,80,80,0.2);color:#e05050">
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M3 10L10 3M10 3H5M10 3v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <div class="body">
        <span class="desc">${before ? "Token transfer: 18" : "Token transfer"}</span>
        <span class="amt">18 COOK</span>
      </div>
      <span class="badge" style="background:rgba(224,80,80,0.12);color:#e05050;border-color:rgba(224,80,80,0.22)">Failed</span>
      <span class="time">5h ago</span>
    </li>
  </ul>
</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: CHROME });

for (const [variant, isBefore] of [["before", true], ["after", false]]) {
  const htmlPath = resolve(OUT, `_crumbs_titles_${variant}.html`);
  await writeFile(htmlPath, makeHTML(isBefore), "utf8");

  const page = await browser.newPage();
  await page.setViewportSize({ width: 700, height: 600 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const box = await page.$eval("#card", el => el.getBoundingClientRect().toJSON());
  const pad = 16;
  await page.screenshot({
    path: resolve(OUT, `crumbs-titles-${variant}.png`),
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad*2, height: box.height + pad*2 },
  });
  console.log(`saved crumbs-titles-${variant}.png`);
  await page.close();
  await unlink(htmlPath).catch(() => {});
}

await browser.close();
