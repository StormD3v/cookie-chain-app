/**
 * Takes screenshots of the connected preview at 320px, 337px, 390px
 * and also opens the actual app at those widths to catch real overflow.
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

const browser = await chromium.launch({ executablePath: CHROME });

// Screenshot actual app (disconnected) at narrow widths — checks for real overflow
for (const vw of [320, 337, 390]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: 844 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const out = resolve(OUT, `narrow-${vw}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
  await page.close();
}

await browser.close();
