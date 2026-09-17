/**
 * Uses the ?preview= bypass to render the connected shell without a wallet,
 * then screenshots the sidebar and heat card from the live running app.
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
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const PREVIEW_ADDR = "Es1fVBnMnUJfPd3EKbMd7cSNQdJiXfGtqCZ4KjXqCaBC";
const BASE = `http://localhost:5173/?preview=${PREVIEW_ADDR}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

console.log("loading preview URL…");
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2000);

// Full page screenshot
await page.screenshot({ path: resolve(OUT, "live-preview.png"), fullPage: false });
console.log("saved live-preview.png");

// ── Sidebar bottom ─────────────────────────────────────────────────────────
const aside = await page.$("aside");
const asideBox = aside ? await aside.boundingBox() : null;
if (asideBox) {
  const bottomH = Math.min(280, asideBox.height);
  await page.screenshot({
    path: resolve(OUT, "sidebar-bottom.png"),
    clip: {
      x: asideBox.x,
      y: asideBox.y + asideBox.height - bottomH,
      width: asideBox.width,
      height: bottomH,
    },
  });
  console.log("saved sidebar-bottom.png");
}

// ── Jar Heat card — with extra top padding to show the bleeding mascot ─────
const heatSection = await page.evaluateHandle(() => {
  for (const h2 of Array.from(document.querySelectorAll("h2"))) {
    if (h2.textContent?.includes("Jar Heat")) return h2.closest("section");
  }
  return null;
});
const heatEl = heatSection.asElement ? heatSection.asElement() : null;
const heatBox = heatEl ? await heatEl.boundingBox() : null;

if (heatBox) {
  const padX = 24;
  const padTop = 40; // extra space above to show the bleed
  const padBot = 24;
  await page.screenshot({
    path: resolve(OUT, "heat-card.png"),
    clip: {
      x: Math.max(0, heatBox.x - padX),
      y: Math.max(0, heatBox.y - padTop),
      width: heatBox.width + padX * 2,
      height: heatBox.height + padTop + padBot,
    },
  });
  console.log("saved heat-card.png");
}

await browser.close();
