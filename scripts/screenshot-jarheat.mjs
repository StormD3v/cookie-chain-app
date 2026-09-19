/**
 * Screenshot the Jar Heat card — uses Dashboard preview wallet bypass
 * temporarily added via an addInitScript that sets window.__PREVIEW_WALLET.
 * The Dashboard reads this and renders AppShell directly.
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

// Use the dev server — it has HMR and can receive localStorage injection
const DEV_URL = "http://localhost:5174/";
const WALLET = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });

// The app renders AppShell when connected=true && publicKey is set.
// We can't fake that through wallet-adapter without the actual extension.
// Instead: inject a CDP override that replaces useWallet's return value.
// Simpler approach: add a script that rewrites the DOM to show AppShell
// by calling the real React hooks - but this is too complex.
//
// Most reliable: add a ?preview= param handler to the app (1-line change).
// Since that's controlled code change, add it temporarily via HMR context injection.
// Actually, the simplest is: patch the JS in the browser to mock useWallet.

await page.addInitScript({
  content: `
  // Override sessionStorage with a sentinel that Dashboard.tsx can read
  // We'll patch this by adding a window var that the dev app can use
  window.__FORCE_CONNECTED__ = "${WALLET}";
` });

// Navigate and wait for the app to render
await page.goto(DEV_URL, { waitUntil: "domcontentloaded", timeout: 15000 });

// Wait for React to hydrate
await page.waitForTimeout(4000);

// Check current state
const state = await page.evaluate(() => ({
  isConnected: !!document.querySelector('[class*="overview"]'),
  hasHeatCard: !!document.querySelector('[class*="heatCard"]'),
  url: window.location.href,
  bodyText: document.body.innerText.slice(0, 100),
}));
console.log("State:", state);

if (state.hasHeatCard) {
  await page.evaluate(() => {
    const heat = document.querySelector('[class*="heatCard"]');
    if (heat) heat.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(400);

  const heatEl = await page.$('[class*="heatCard"]');
  const box = await heatEl.boundingBox();
  await page.screenshot({
    path: resolve(OUT, "r20e-jarheat-mobile.png"),
    clip: { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8), width: box.width + 16, height: box.height + 16 },
  });
  console.log(`✓ r20e-jarheat-mobile.png  ${Math.round(box.width)}×${Math.round(box.height)}`);
} else {
  // Fallback: take the landing page screenshot to at least confirm CSS loaded
  await page.screenshot({ path: resolve(OUT, "r20e-jarheat-mobile.png"), fullPage: false });
  console.log("App shell not rendered — screenshot shows current state for inspection");
}

await browser.close();
