/**
 * scripts/screenshot.mjs
 *
 * Takes desktop (1440x900) and mobile (390x844) screenshots of the app.
 * Requires:
 *   1. npm install -D playwright           (already done)
 *   2. npx playwright install chromium     (requires ~196MB download)
 *   3. npm run dev                         (app running on localhost:5173)
 *
 * Usage:
 *   node scripts/screenshot.mjs
 *   node scripts/screenshot.mjs --port 5174   (if Vite bumped ports)
 *   node scripts/screenshot.mjs --out shots   (custom output directory)
 *
 * Output: screenshots/desktop.png + screenshots/mobile.png (or --out dir)
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const portIdx = args.indexOf("--port");
const outIdx = args.indexOf("--out");

const PORT = portIdx !== -1 ? args[portIdx + 1] : "5173";
const OUT_DIR = resolve(__dirname, "..", outIdx !== -1 ? args[outIdx + 1] : "screenshots");
const BASE = `http://localhost:${PORT}`;

// ── Viewports ─────────────────────────────────────────────────────────────────

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    // Use the full Chrome binary that downloaded successfully.
    // Playwright defaults to chromium-headless-shell which didn't complete;
    // the regular chrome.exe works fine for screenshot purposes.
    executablePath: resolve(
      env["USERPROFILE"] ?? env["HOME"] ?? "",
      "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
    ),
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });

    console.log(`[screenshot] loading ${BASE} at ${vp.width}x${vp.height}…`);
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });

    // Give fonts and animations a moment to settle
    await page.waitForTimeout(800);

    const out = resolve(OUT_DIR, `${vp.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`[screenshot] saved ${out}`);

    await page.close();
  }

  await browser.close();
  console.log("[screenshot] done");
}

run().catch((err) => {
  console.error("[screenshot] failed:", err.message);
  process.exit(1);
});
