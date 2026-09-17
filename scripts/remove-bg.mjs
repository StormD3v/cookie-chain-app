/**
 * Removes the background from cookie-running.png using canvas flood-fill.
 * Two-pass approach: tight tolerance per-seed, then edge sweep for fringe pixels.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile, readFile } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSET_SRC = resolve(__dirname, "../src/assets/cookie-running.png");
const ASSET_OUT = resolve(__dirname, "../src/assets/cookie-running-nobg.png");
const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const imgBuffer = await readFile(ASSET_SRC);
const dataUrl = `data:image/png;base64,${imgBuffer.toString("base64")}`;
console.log(`Input: ${imgBuffer.length} bytes`);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const resultBase64 = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });

  const W = img.naturalWidth, H = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, W, H);
  const d = imageData.data;

  const px = (x, y) => (y * W + x) * 4;
  const dist = (i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  function fill(sx, sy, refR, refG, refB, tol) {
    const stack = [[sx, sy]];
    const visited = new Uint8Array(W * H);
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const idx = y * W + x;
      if (visited[idx]) continue;
      visited[idx] = 1;
      const i = idx * 4;
      if (d[i + 3] === 0) continue;
      if (dist(i, refR, refG, refB) > tol) continue;
      d[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }

  // Pass 1: flood fill from 8 edge sample points, each with its own local color
  // Use tight tolerance (22) so we don't eat into the character
  const seeds = [
    [10, 10], [W - 10, 10], [10, H - 10], [W - 10, H - 10],
    [W >> 1, 5], [5, H >> 1], [W - 5, H >> 1], [W >> 1, H - 5],
  ];
  for (const [sx, sy] of seeds) {
    const i = px(sx, sy);
    fill(sx, sy, d[i], d[i + 1], d[i + 2], 22);
  }

  // Pass 2: sweep every edge pixel — if it's still opaque AND looks like background
  // (dark/desaturated), fill it with slightly looser tolerance (30)
  const edgeCoords = [];
  for (let x = 0; x < W; x++) { edgeCoords.push([x, 0], [x, H - 1]); }
  for (let y = 1; y < H - 1; y++) { edgeCoords.push([0, y], [W - 1, y]); }

  for (const [ex, ey] of edgeCoords) {
    const i = px(ex, ey);
    if (d[i + 3] === 0) continue;
    // Skip pixels that are bright AND saturated — those are the character
    const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
    const saturation = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    if (brightness > 110 && saturation > 55) continue;
    fill(ex, ey, d[i], d[i + 1], d[i + 2], 30);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png").split(",")[1];
}, dataUrl);

const outBuf = Buffer.from(resultBase64, "base64");
await writeFile(ASSET_OUT, outBuf);
console.log(`Saved: ${ASSET_OUT} (${outBuf.length} bytes)`);
await browser.close();
