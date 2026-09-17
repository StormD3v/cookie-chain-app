/**
 * Samples a grid of pixels across cookie-running.png to understand
 * where the character body is vs the background.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const src = resolve(__dirname, "../src/assets/cookie-running.png");
const buf = await readFile(src);
const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

// Also render the image at 300px wide so we can see it as a thumbnail
const thumbB64 = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((r,e) => { img.onload=r; img.onerror=e; img.src=dataUrl; });
  const W=300, H=Math.round(img.naturalHeight*(300/img.naturalWidth));
  const c=document.createElement("canvas"); c.width=W; c.height=H;
  c.getContext("2d").drawImage(img,0,0,W,H);
  return c.toDataURL("image/png").split(",")[1];
}, dataUrl);

await writeFile(resolve(__dirname, "../screenshots/running-thumb.png"), Buffer.from(thumbB64,"base64"));
console.log("saved running-thumb.png");

// Sample brightness across horizontal strips at y=25%, 50%, 75%
const analysis = await page.evaluate(async (dataUrl) => {
  const img = new Image();
  await new Promise((r,e) => { img.onload=r; img.onerror=e; img.src=dataUrl; });
  const W=img.naturalWidth, H=img.naturalHeight;
  const c=document.createElement("canvas"); c.width=W; c.height=H;
  c.getContext("2d").drawImage(img,0,0);
  const d=c.getContext("2d").getImageData(0,0,W,H).data;

  const rows = [0.25,0.5,0.75].map(yFrac => {
    const y = Math.floor(yFrac * H);
    const samples = [];
    for (let xPct=0; xPct<=100; xPct+=5) {
      const x = Math.floor(xPct/100 * (W-1));
      const i=(y*W+x)*4;
      const brightness=(d[i]+d[i+1]+d[i+2])/3;
      const sat=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);
      samples.push({ xPct, brightness: Math.round(brightness), sat: Math.round(sat), r:d[i],g:d[i+1],b:d[i+2] });
    }
    return { yFrac, samples };
  });
  return { W, H, rows };
}, dataUrl);

console.log(`Dimensions: ${analysis.W} x ${analysis.H}`);
for (const row of analysis.rows) {
  console.log(`\n--- y=${Math.round(row.yFrac*100)}% ---`);
  for (const s of row.samples) {
    const bar = "█".repeat(Math.round(s.brightness/10));
    console.log(`  x=${String(s.xPct).padStart(3)}%  brightness=${String(s.brightness).padStart(3)}  sat=${String(s.sat).padStart(3)}  rgb(${s.r},${s.g},${s.b})  ${bar}`);
  }
}

await browser.close();
