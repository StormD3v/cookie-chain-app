/**
 * Samples corner pixels of the cookie-running image as rendered in the page
 * to determine its background color.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const PREVIEW_ADDR = "Es1fVBnMnUJfPd3EKbMd7cSNQdJiXfGtqCZ4KjXqCaBC";
const BASE = `http://localhost:5173/?preview=${PREVIEW_ADDR}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(1500);

// Find the heatMascot image and sample its corner pixel
const result = await page.evaluate(() => {
  // Find img inside the heat card
  const h2s = Array.from(document.querySelectorAll("h2"));
  const heatH2 = h2s.find(h => h.textContent?.includes("Jar Heat"));
  const section = heatH2?.closest("section");
  const img = section?.querySelector("img");
  if (!img) return { error: "img not found" };

  const box = img.getBoundingClientRect();

  // Draw the image onto a canvas to sample pixels
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // Sample 4 corners (10px in from each corner)
  const offset = 10;
  const corners = [
    [offset, offset],
    [img.naturalWidth - offset, offset],
    [offset, img.naturalHeight - offset],
    [img.naturalWidth - offset, img.naturalHeight - offset],
    // center
    [Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2)],
  ];

  const pixels = corners.map(([x, y]) => {
    const d = ctx.getImageData(x, y, 1, 1).data;
    return { x, y, r: d[0], g: d[1], b: d[2], a: d[3] };
  });

  return { naturalW: img.naturalWidth, naturalH: img.naturalHeight, box, pixels };
});

console.log("image info:", JSON.stringify(result, null, 2));
await browser.close();
