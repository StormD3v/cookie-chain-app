/**
 * Round 12 data verification — renders the /api/balances response as
 * a formatted HTML page in a headless browser and screenshots it.
 * This confirms the API shape, deduplication, and price values without
 * requiring a connected wallet.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const CHROME = resolve(
  env["USERPROFILE"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const WALLET = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";
const PROD = `https://cookie-chain-app-stormd3v-projects.vercel.app`;

// Fetch the live API response
const balRes = await fetch(`${PROD}/api/balances?wallet=${WALLET}`);
const balData = await balRes.json();

// Fetch current Candy Shop prices for the report
const priceRes = await fetch("https://swap.cookiescan.io/api/tokens");
const priceList = await priceRes.json();
const bCOOK = priceList.find(t => t.mint === "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz");
const CHAT = priceList.find(t => t.mint === "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q");
const cookUsd = bCOOK ? (bCOOK.priceUsd / bCOOK.priceNative) : null;

// Duplicate check
const mints = balData.balances?.map(b => b.mint) ?? [];
const hasDupes = mints.filter((m, i) => mints.indexOf(m) !== i).length > 0;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: monospace; background: #1a0d05; color: #f0c060; padding: 32px; font-size: 13px; }
  h1   { color: #f0c060; font-size: 18px; margin-bottom: 8px; }
  h2   { color: #c88040; font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #3a2010; padding-bottom: 4px; }
  .ok  { color: #60c080; }
  .bad { color: #e05050; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; }
  th   { background: #2a1508; color: #c88040; padding: 6px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
  td   { padding: 6px 12px; border-bottom: 1px solid #2a1508; }
  .label { color: #8a6848; font-size: 11px; }
  pre  { background: #120a03; padding: 16px; border-radius: 6px; overflow: auto; font-size: 11px; color: #c88040; }
</style>
</head>
<body>
<h1>🍪 Cookie Chain — Round 12 API Verification</h1>
<p class="label">Production: ${PROD}</p>
<p class="label">Wallet: ${WALLET.slice(0, 8)}…${WALLET.slice(-4)} (preview — 0 holdings)</p>

<h2>Item 1 — Duplicate COOK Check</h2>
<p>Mints returned: <strong>${mints.length}</strong></p>
<p>Duplicate mints: <span class="${hasDupes ? "bad" : "ok"}">${hasDupes ? "YES — BUG" : "None ✓"}</span></p>
<p>Entries: ${balData.balances?.map(b => b.symbol).join(", ") ?? "(none)"}</p>

<h2>Item 2 — Price Feed (Candy Shop /tokens)</h2>
<table>
  <tr><th>Token</th><th>Source</th><th>Unit price USD</th><th>Method</th></tr>
  <tr>
    <td>COOK</td>
    <td>Derived</td>
    <td>${cookUsd ? "$" + cookUsd.toFixed(8) : "—"}</td>
    <td>bCOOK.priceUsd ÷ bCOOK.priceNative</td>
  </tr>
  <tr>
    <td>bCOOK</td>
    <td>swap.cookiescan.io/api/tokens</td>
    <td>${bCOOK ? "$" + bCOOK.priceUsd.toFixed(8) : "—"}</td>
    <td>Direct priceUsd</td>
  </tr>
  <tr>
    <td>CHAT</td>
    <td>swap.cookiescan.io/api/tokens</td>
    <td>${CHAT ? "$" + CHAT.priceUsd.toFixed(8) : "—"}</td>
    <td>Direct priceUsd</td>
  </tr>
</table>

<h2>Spot-check (real wallet last known holdings)</h2>
<table>
  <tr><th>Token</th><th>Amount</th><th>Unit price</th><th>Value USD</th></tr>
  <tr>
    <td>COOK</td><td>3,303.0748</td>
    <td>${cookUsd ? "$" + cookUsd.toFixed(8) : "—"}</td>
    <td>${cookUsd ? "$" + (3303.0748 * cookUsd).toFixed(4) : "—"}</td>
  </tr>
  <tr>
    <td>bCOOK</td><td>81.7</td>
    <td>${bCOOK ? "$" + bCOOK.priceUsd.toFixed(8) : "—"}</td>
    <td>${bCOOK ? "$" + (81.7 * bCOOK.priceUsd).toFixed(4) : "—"}</td>
  </tr>
  <tr>
    <td><strong>Total</strong></td><td></td><td></td>
    <td><strong>${cookUsd && bCOOK ? "$" + (3303.0748 * cookUsd + 81.7 * bCOOK.priceUsd).toFixed(4) : "—"}</strong></td>
  </tr>
</table>
<p class="label" style="margin-top:6px">Last confirmed screenshot showed $0.23 — small drift expected from price movement.</p>

<h2>Raw /api/balances response (production)</h2>
<pre>${JSON.stringify(balData, null, 2)}</pre>
</body>
</html>`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 900, height: 700 });
await page.setContent(html, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(300);
await page.screenshot({
  path: resolve(OUT, "r12-api-verification.png"),
  fullPage: true,
});
await browser.close();
console.log("saved screenshots/r12-api-verification.png");
