/**
 * Screenshots the Crumbs feed from the full-page Crumbs section
 * and the compact crumbs panel in Overview, at desktop and mobile.
 * Uses the DEV ?preview= bypass (only works in dev mode).
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
const ADDR = "Es1fVBnMnUJfPd3EKbMd7cSNQdJiXfGtqCZ4KjXqCaBC";

const browser = await chromium.launch({ executablePath: CHROME });

for (const [label, w] of [["desktop", 1440], ["mobile", 390]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 900 });

  // Navigate to Crumbs section
  await page.goto(`http://localhost:5173/?preview=${ADDR}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);

  // Navigate to Crumbs using page.click which handles visibility better
  try {
    await page.click("button:has-text('Crumbs')", { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch {
    // Try clicking any element containing "Crumbs" text
    try {
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("button, [role='tab']")) {
          if (el.textContent?.trim() === "Crumbs") { el.click(); return; }
        }
      });
      await page.waitForTimeout(2000);
    } catch {
      console.log(`${label}: Could not navigate to Crumbs, using full page`);
    }
  }

  await page.screenshot({ path: resolve(OUT, `crumbs-${label}.png`), fullPage: false });
  console.log(`saved crumbs-${label}.png`);
  await page.close();
}

await browser.close();
