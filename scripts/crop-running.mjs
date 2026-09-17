/**
 * Crops cookie-running.png to the left 65% (where the character is clearly defined
 * against a dark background) and removes that background via flood-fill.
 * Saves result as cookie-running-nobg.png.
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

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const resultBase64 = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });

  const srcW = img.naturalWidth, srcH = img.naturalHeight;

  // Crop: left 58% of width, full height — keeps the character body and face,
  // discards the right motion-trail region where bg and character colors merge
  const cropX = Math.floor(srcW * 0.08);
  const cropW = Math.floor(srcW * 0.58);
  const W = cropW, H = srcH;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  // Draw only the cropped region
  ctx.drawImage(img, cropX, 0, cropW, srcH, 0, 0, W, H);

  const imageData = ctx.getImageData(0, 0, W, H);
  const d = imageData.data;

  const dist = (i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  function fill(sx, sy, refR, refG, refB, tol) {
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) return;
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

  // Sample & fill from the 4 corners — after crop these should all be dark bg
  const corners = [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]];
  for (const [cx, cy] of corners) {
    const i = (cy * W + cx) * 4;
    fill(cx, cy, d[i], d[i + 1], d[i + 2], 28);
  }

  // Edge sweep at slightly higher tolerance
  for (let x = 0; x < W; x++) {
    for (const y of [0, H - 1]) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      if (brightness > 100 && sat > 50) continue;
      fill(x, y, d[i], d[i + 1], d[i + 2], 32);
    }
  }
  for (let y = 0; y < H; y++) {
    for (const x of [0, W - 1]) {
      const i = (y * W + x) * 4;
      if (d[i + 3] === 0) continue;
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      if (brightness > 100 && sat > 50) continue;
      fill(x, y, d[i], d[i + 1], d[i + 2], 32);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png").split(",")[1];
}, dataUrl);

const outBuf = Buffer.from(resultBase64, "base64");
await writeFile(ASSET_OUT, outBuf);
console.log(`Saved: ${ASSET_OUT} (${outBuf.length} bytes)`);
await browser.close();
