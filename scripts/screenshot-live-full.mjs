/**
 * Live screenshot of the Overview section — hero+jar card and chart — both viewports.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

// Use the wallet that has real activity (seen in server logs)
const ADDR = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";

const browser = await chromium.launch({ executablePath: CHROME });

for (const [label, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`http://localhost:5173/?preview=${ADDR}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  // Wait for React to render and data to arrive
  await page.waitForTimeout(3500);

  // Full page screenshot for context
  await page.screenshot({
    path: resolve(OUT, `live-${label}.png`),
    fullPage: false,
  });
  console.log(`saved live-${label}.png`);

  // Close-up crop of the hero+jar area (top of left column)
  const heroWrap = await page.evaluateHandle(() => {
    for (const el of document.querySelectorAll("div")) {
      if ((el.className || "").includes("jarHeroWrap")) return el;
    }
    // fallback: find section containing "YOUR JAR"
    for (const el of document.querySelectorAll("section")) {
      if (el.textContent?.includes("YOUR JAR")) return el.parentElement;
    }
    return null;
  });
  const heroEl = heroWrap.asElement ? heroWrap.asElement() : null;
  const heroBox = heroEl ? await heroEl.boundingBox() : null;

  if (heroBox) {
    const padTop = 24; // space above for mascot bleed
    await page.screenshot({
      path: resolve(OUT, `crop-hero-${label}.png`),
      clip: {
        x: Math.max(0, heroBox.x - 8),
        y: Math.max(0, heroBox.y - padTop),
        width: Math.min(w, heroBox.width + 16),
        height: Math.min(h, heroBox.height + padTop + 16),
      },
    });
    console.log(`saved crop-hero-${label}.png  box: ${JSON.stringify(heroBox)}`);
  } else {
    console.log(`${label}: jarHeroWrap not found — using fixed crop`);
    await page.screenshot({
      path: resolve(OUT, `crop-hero-${label}.png`),
      clip: { x: w === 1440 ? 264 : 0, y: 70, width: w === 1440 ? 750 : w, height: 480 },
    });
  }

  // Chart close-up — find the sparkline SVG
  const chartEl = await page.$("svg[class*='sparklineSvg']");
  const chartBox = chartEl ? await chartEl.boundingBox() : null;
  if (chartBox) {
    const pad = 16;
    await page.screenshot({
      path: resolve(OUT, `crop-chart-${label}.png`),
      clip: {
        x: Math.max(0, chartBox.x - pad),
        y: Math.max(0, chartBox.y - pad),
        width: Math.min(w, chartBox.width + pad * 2),
        height: chartBox.height + pad * 2,
      },
    });
    console.log(`saved crop-chart-${label}.png`);
  }

  await page.close();
}

await browser.close();
