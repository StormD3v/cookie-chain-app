/**
 * Takes a screenshot after scrolling the main content area to prove
 * the sidebar stays fixed while content scrolls past.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(1500);

// Scroll the window (page scroll since .body is the scrolling container via overflow-y:auto,
// but window.scrollBy also works if it's the document body scrolling)
await page.evaluate(() => {
  // Try both: the .body flex child and the window
  const bodies = document.querySelectorAll("div");
  for (const el of bodies) {
    const style = getComputedStyle(el);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      el.scrollTop = 600;
    }
  }
  window.scrollBy(0, 600);
});
await page.waitForTimeout(600);
await page.screenshot({ path: resolve(OUT, "live-scrolled.png") });
console.log("saved live-scrolled.png");
await browser.close();
