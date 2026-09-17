/**
 * Samples the cookie-jar-hug.png corner pixels to check if the background
 * matches the card color, and generates a thumbnail for visual inspection.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const buf = await readFile(resolve(__dirname, "../src/assets/cookie-jar-hug.png"));
const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const result = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((r, e) => { img.onload = r; img.onerror = e; img.src = dataUrl; });
  const W = img.naturalWidth, H = img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const px = (x, y) => { const d = ctx.getImageData(x, y, 1, 1).data; return { r: d[0], g: d[1], b: d[2], a: d[3] }; };

  // Sample multiple points near the top-left corner (where it meets the card)
  const points = [
    [5, 5], [20, 5], [5, 20], [20, 20],
    [5, H - 5], [W - 5, 5], [W - 5, H - 5],
    [W >> 1, H >> 1],
  ];
  const samples = points.map(([x, y]) => ({ x, y, ...px(x, y) }));

  // Generate a small thumbnail
  const thumbW = 300, thumbH = Math.round(H * (300 / W));
  const tc = document.createElement("canvas"); tc.width = thumbW; tc.height = thumbH;
  tc.getContext("2d").drawImage(img, 0, 0, thumbW, thumbH);

  return { W, H, samples, thumb: tc.toDataURL("image/png").split(",")[1] };
}, dataUrl);

await writeFile(resolve(OUT, "mascot-thumb.png"), Buffer.from(result.thumb, "base64"));
console.log(`Dimensions: ${result.W} x ${result.H}`);
console.log("Corner/edge pixel samples:");
for (const s of result.samples) {
  const hex = `#${[s.r, s.g, s.b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
  console.log(`  (${String(s.x).padStart(4)},${String(s.y).padStart(4)})  rgb(${s.r},${s.g},${s.b})  ${hex}  alpha=${s.a}`);
}
// Card background for comparison
console.log("\nCard bg: rgba(50,28,11,0.55) → on dark (#0f0c0a) ≈ rgb(29,17,6)");
console.log("saved mascot-thumb.png");

await browser.close();
