/**
 * Round 20e screenshot verification.
 * 1. Hero subtitle legibility at 3 widths
 * 2. Mobile Jar Heat card (requires connected wallet state)
 *    — use preview wallet bypass via VITE_PREVIEW_WALLET env var
 */
import { chromium } from "playwright";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";
import { env } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const CHROME = resolve(env["USERPROFILE"], "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const browser = await chromium.launch({ executablePath: CHROME });

// ── Hero subtitle check (landing page) ──────────────────────────────────────
for (const [label, w, h] of [["mobile-380", 380, 820], ["laptop-1440", 1440, 900], ["wide-1920", 1920, 1080]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://localhost:4173/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(OUT, `r20e-hero-${label}.png`), fullPage: false });
  console.log(`✓ r20e-hero-${label}.png`);
  await page.close();
}

// ── Jar Heat card on mobile (needs app shell = connected wallet) ─────────────
// Use VITE_PREVIEW_WALLET environment variable workaround
// The app reads this in dev but not prod — must set it for the preview server
// Since we can't set it at runtime here, use the dev server with the env var
const WALLET = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";
// Try hitting the dev server if it's running on 5173 with the env var
// Otherwise take a note-only screenshot
const DEV_PORT = 5174;
try {
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://localhost:${DEV_PORT}/?preview=${WALLET}`, { waitUntil: "networkidle", timeout: 8000 });
  await page.waitForTimeout(2000);
  // Scroll to the Jar Heat section
  await page.evaluate(() => {
    const heat = document.querySelector('[class*="heatCard"]');
    if (heat) heat.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(400);
  // Crop just the Jar Heat card area
  const heatEl = await page.$('[class*="heatCard"]');
  if (heatEl) {
    const box = await heatEl.boundingBox();
    await page.screenshot({
      path: resolve(OUT, "r20e-jar-heat-mobile.png"),
      clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 },
    });
    console.log(`✓ r20e-jar-heat-mobile.png  (${Math.round(box.width)}×${Math.round(box.height)})`);
  }
  await page.close();
} catch (e) {
  console.log(`NOTE: Dev server not available on ${DEV_PORT} for Jar Heat screenshot: ${e.message}`);
}

await browser.close();
console.log("\nDone.");
