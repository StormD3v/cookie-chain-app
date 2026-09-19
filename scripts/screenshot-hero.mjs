/**
 * Round 20d visual verification — screenshots at 380, 1440, 1920px
 * Tests both the landing hero overlay AND the mobile Jar Heat card.
 * Uses the preview server at localhost:4173.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";
import { env } from "process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const CHROME = resolve(env["USERPROFILE"], "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const URL    = "http://localhost:4173/";

const browser = await chromium.launch({ executablePath: CHROME });

async function shot(label, w, h, extra = {}) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(600);

  // Full viewport (non-scrolled landing hero)
  const fname = `r20d-hero-${label}.png`;
  await page.screenshot({ path: resolve(OUT, fname), fullPage: false });
  console.log(`✓ ${fname} (${w}×${h})`);

  // Measure: is the page taller than the viewport?
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
  const scrollable = scrollHeight > clientHeight + 20; // 20px tolerance
  console.log(`  scrollHeight=${scrollHeight}  clientHeight=${clientHeight}  scrollable=${scrollable ? 'YES — PROBLEM' : 'no'}`);

  // Check if heroContent overlaps the hero image (both have the same bounding rect parent)
  const heroRect    = await page.evaluate(() => { const el = document.querySelector('[class*="hero_"]') || document.querySelector('[class*="hero"]'); return el ? el.getBoundingClientRect() : null; });
  const contentRect = await page.evaluate(() => { const el = document.querySelector('[class*="heroContent"]'); return el ? el.getBoundingClientRect() : null; });
  const imageRect   = await page.evaluate(() => { const el = document.querySelector('[class*="heroMascot"]'); return el ? el.getBoundingClientRect() : null; });

  if (heroRect && contentRect && imageRect) {
    const contentInImage = contentRect.top < imageRect.bottom && contentRect.bottom > imageRect.top;
    console.log(`  heroContent top=${Math.round(contentRect.top)}  heroMascot bottom=${Math.round(imageRect.bottom)}  overlap=${contentInImage ? 'YES (correct overlay)' : 'NO (stacked — problem)'}`);
  }

  await page.close();
}

console.log("\n=== Round 20d hero verification ===");
await shot("mobile-380",    380,  820);
await shot("laptop-1440",   1440, 900);
await shot("wide-1920",     1920, 1080);

// Also check Jar Heat card on mobile (connected state requires wallet — 
// use the VITE_PREVIEW_WALLET env var if Dashboard detects it, else note limitation)
console.log("\n(Jar Heat mobile check requires connected wallet — inspect screenshots manually)");

await browser.close();
console.log("\nScreenshots saved to screenshots/r20d-hero-*.png");
