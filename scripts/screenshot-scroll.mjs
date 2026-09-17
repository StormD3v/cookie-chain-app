/**
 * Tests sticky header + fixed sidebar while scrolled.
 * Uses a full-page layout to generate enough content for real scrolling.
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
const ADDR = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";

const browser = await chromium.launch({ executablePath: CHROME });

// ── Desktop ──────────────────────────────────────────────────────────────────
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://localhost:5173/?preview=${ADDR}`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(3000);

// Inject enough extra height to create real scroll room
await page.evaluate(() => {
  const spacer = document.createElement("div");
  spacer.style.height = "1200px";
  spacer.style.flexShrink = "0";
  document.querySelector("main")?.appendChild(spacer);
});
await page.waitForTimeout(200);

// Measure pre-scroll
const before = await page.evaluate(() => {
  const h = document.querySelector("header")?.getBoundingClientRect();
  const s = document.querySelector("aside")?.getBoundingClientRect();
  return { scrollY: window.scrollY, headerTop: Math.round(h?.top ?? 0), sidebarTop: Math.round(s?.top ?? 0) };
});
console.log("Before scroll:", before);

// Scroll 800px
await page.evaluate(() => window.scrollTo({ top: 800, behavior: "instant" }));
await page.waitForTimeout(300);

const after = await page.evaluate(() => {
  const h = document.querySelector("header")?.getBoundingClientRect();
  const s = document.querySelector("aside")?.getBoundingClientRect();
  return {
    scrollY: window.scrollY,
    headerTop: Math.round(h?.top ?? 0),
    sidebarTop: Math.round(s?.top ?? 0),
    headerStaysFixed: Math.round(h?.top ?? 0) === 0,
    sidebarStaysFixed: Math.round(s?.top ?? 0) === 52,
  };
});
console.log("After scroll 800px:", after);

await page.screenshot({ path: resolve(OUT, "r5-scrolled-800-desktop.png") });
console.log("saved r5-scrolled-800-desktop.png");

await page.close();

// ── Mobile ────────────────────────────────────────────────────────────────────
const mob = await browser.newPage();
await mob.setViewportSize({ width: 390, height: 844 });
await mob.goto(`http://localhost:5173/?preview=${ADDR}`, { waitUntil: "domcontentloaded", timeout: 20000 });
await mob.waitForTimeout(2500);
await mob.evaluate(() => {
  const spacer = document.createElement("div");
  spacer.style.height = "1200px";
  document.querySelector("main")?.appendChild(spacer);
});
await mob.waitForTimeout(200);
await mob.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
await mob.waitForTimeout(300);
const mobAfter = await mob.evaluate(() => {
  const h = document.querySelector("header")?.getBoundingClientRect();
  return { scrollY: window.scrollY, headerTop: Math.round(h?.top ?? 0) };
});
console.log("Mobile after scroll 600px:", mobAfter);
await mob.screenshot({ path: resolve(OUT, "r5-scrolled-600-mobile.png") });
console.log("saved r5-scrolled-600-mobile.png");
await mob.close();

await browser.close();
