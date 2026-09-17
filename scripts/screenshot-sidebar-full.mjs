/**
 * Captures the live app's sidebar at full height (desktop, connected state)
 * so the cookie-cluster / status-footer overlap area is fully visible.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(900);

// Clip to exactly the sidebar: x=0, y=0, width=240, full viewport height
const aside = await page.$("aside");
const box = aside ? await aside.boundingBox() : { x: 0, y: 0, width: 240, height: 900 };

await page.screenshot({
  path: resolve(OUT, "sidebar-full-bottom.png"),
  clip: {
    x: box.x,
    y: Math.max(0, box.y + box.height - 320), // bottom 320px of sidebar
    width: box.width,
    height: Math.min(320, box.height),
  },
});
console.log("saved sidebar-full-bottom.png");

// Also save a full-sidebar shot
await page.screenshot({
  path: resolve(OUT, "sidebar-full.png"),
  clip: { x: box.x, y: box.y, width: box.width, height: box.height },
});
console.log("saved sidebar-full.png");

await page.close();
await browser.close();
