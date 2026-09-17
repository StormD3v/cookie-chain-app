/**
 * Verifies cookie-running-nobg.png has transparent corners.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const imgPath = resolve(__dirname, "../src/assets/cookie-running-nobg.png");
const b64 = readFileSync(imgPath).toString("base64");
const dataUrl = `data:image/png;base64,${b64}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const result = await page.evaluate(async ({ dataUrl }) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const W = img.naturalWidth, H = img.naturalHeight;
  const corners = [[5,5],[W-5,5],[5,H-5],[W-5,H-5]];
  return corners.map(([x,y]) => {
    const d = ctx.getImageData(x,y,1,1).data;
    return { x, y, r: d[0], g: d[1], b: d[2], a: d[3] };
  });
}, { dataUrl });

console.log("corner pixels (a=0 means transparent):");
console.log(JSON.stringify(result, null, 2));
await browser.close();
