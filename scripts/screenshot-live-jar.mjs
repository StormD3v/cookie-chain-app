import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const ADDR = "Es1fVBnMnUJfPd3EKbMd7cSNQdJiXfGtqCZ4KjXqCaBC";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://localhost:5173/?preview=${ADDR}`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);

// Full page for context
await page.screenshot({ path: resolve(OUT, "live-jar-full.png") });
console.log("saved live-jar-full.png");

// Dump the computed styles and bounding boxes of the key elements
const info = await page.evaluate(() => {
  const get = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return {
      exists: true,
      class: el.className,
      box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
      position: s.position,
      borderRadius: s.borderRadius,
      borderTopLeftRadius: s.borderTopLeftRadius,
      overflow: s.overflow,
      zIndex: s.zIndex,
      background: s.background.substring(0, 60),
      marginTop: s.marginTop,
      paddingTop: s.paddingTop,
    };
  };

  // Find elements by class name fragments
  const findByClass = (frag) => {
    for (const el of document.querySelectorAll("*")) {
      if (el.className && typeof el.className === "string" && el.className.includes(frag)) {
        return get(`.${el.className.trim().split(/\s+/)[0]}`);
      }
    }
    return null;
  };

  // Try to find jarHero, jarMascotWrap, jarCard by iterating all elements
  const results = {};
  for (const el of document.querySelectorAll("div, section")) {
    const cn = (el.className || "").toString();
    if (cn.includes("jarHero")) results.jarHero = { cn, box: el.getBoundingClientRect().toJSON(), pos: window.getComputedStyle(el).position };
    if (cn.includes("jarMascot")) results.jarMascotWrap = { cn, box: el.getBoundingClientRect().toJSON(), pos: window.getComputedStyle(el).position, bg: window.getComputedStyle(el).background.substring(0,80) };
    if (cn.includes("jarCard")) results.jarCard = { cn, box: el.getBoundingClientRect().toJSON(), borderTL: window.getComputedStyle(el).borderTopLeftRadius, paddingTop: window.getComputedStyle(el).paddingTop, pos: window.getComputedStyle(el).position };
    if (cn.includes("jarGreeting")) results.jarGreetingRow = { cn, box: el.getBoundingClientRect().toJSON(), pos: window.getComputedStyle(el).position };
    if (cn.includes("heroMascot")) results.heroMascot = { cn, box: el.getBoundingClientRect().toJSON() };
  }
  return results;
});

console.log("DOM inspection:", JSON.stringify(info, null, 2));

// Crop to the jar hero area if we found it
if (info.jarHero) {
  const b = info.jarHero.box;
  await page.screenshot({
    path: resolve(OUT, "live-jar-crop.png"),
    clip: { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 20), width: b.width + 20, height: b.height + 40 },
  });
  console.log("saved live-jar-crop.png");
} else {
  console.log("jarHero not found in DOM — CSS modules may hash class names");
  // Take the left column area
  await page.screenshot({
    path: resolve(OUT, "live-jar-crop.png"),
    clip: { x: 240, y: 70, width: 760, height: 280 },
  });
  console.log("saved live-jar-crop.png (fixed crop)");
}

await browser.close();
