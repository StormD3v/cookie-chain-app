/**
 * Takes a full-page screenshot of the live app at both viewport sizes.
 * Saves as live-full-desktop.png and live-full-mobile.png.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w, h] of [
  ["live-full-desktop", 1440, 900],
  ["live-full-mobile", 390, 844],
]) {
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  const root = await page.evaluate(() => document.getElementById("root")?.children.length ?? 0);
  console.log(`${name}: root children=${root}, errors=${errs.length}`);
  if (errs.length) console.log("  errors:", errs);
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: true });
  console.log(`  saved ${name}.png`);
  await page.close();
}

await browser.close();
