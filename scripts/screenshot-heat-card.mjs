/**
 * Captures the Jar Heat card from the live app (Overview section, left column).
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

// Find the heat card by its h2 text content
const heatSection = await page.evaluateHandle(() => {
  for (const h2 of document.querySelectorAll("h2")) {
    if (h2.textContent?.includes("Jar Heat")) {
      return h2.closest("section");
    }
  }
  return null;
});

const box = heatSection ? await heatSection.asElement()?.boundingBox() : null;

if (box) {
  // Add small padding around the card
  const pad = 16;
  await page.screenshot({
    path: resolve(OUT, "heat-card.png"),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });
  console.log("saved heat-card.png");
} else {
  // Fallback: full page
  await page.screenshot({ path: resolve(OUT, "heat-card.png") });
  console.log("saved heat-card.png (fallback full page)");
}

await page.close();
await browser.close();
