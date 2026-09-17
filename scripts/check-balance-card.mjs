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
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`http://localhost:5173/?preview=${ADDR}`, { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(3000);

// Diagnose the scroll container
const diagnosis = await page.evaluate(() => {
  function findScrollParent(el) {
    if (!el || el === document.body) return "body";
    const s = window.getComputedStyle(el);
    if (s.overflowY === "auto" || s.overflowY === "scroll" || s.overflowY === "overlay") {
      return el.tagName + "#" + (el.id || "") + "." + [...el.classList].slice(0, 2).join(".");
    }
    return findScrollParent(el.parentElement);
  }
  const shell = document.querySelector("div[class]");
  const sShell = shell ? window.getComputedStyle(shell) : null;
  const sidebar = document.querySelector("aside");
  const header = document.querySelector("header");
  const bh = header?.getBoundingClientRect();
  const bs = sidebar?.getBoundingClientRect();
  return {
    shellClass: shell?.className?.substring(0, 50),
    shellOverflowX: sShell?.overflowX,
    shellOverflowY: sShell?.overflowY,
    sidebarScrollParent: sidebar ? findScrollParent(sidebar.parentElement) : null,
    docScrollHeight: document.documentElement.scrollHeight,
    windowHeight: window.innerHeight,
    bodyScrollable: document.documentElement.scrollHeight > window.innerHeight,
    headerPos: header ? window.getComputedStyle(header).position : null,
    sidebarPos: sidebar ? window.getComputedStyle(sidebar).position : null,
    headerTop: bh ? Math.round(bh.top) : null,
    sidebarTop: bs ? Math.round(bs.top) : null,
  };
});
console.log("Diagnosis:", JSON.stringify(diagnosis, null, 2));

// Now scroll and measure
await page.evaluate(() => window.scrollTo(0, 600));
await page.waitForTimeout(300);

const afterScroll = await page.evaluate(() => {
  const header = document.querySelector("header");
  const sidebar = document.querySelector("aside");
  const bh = header?.getBoundingClientRect();
  const bs = sidebar?.getBoundingClientRect();
  return {
    scrollY: window.scrollY,
    headerTop: bh ? Math.round(bh.top) : null,
    sidebarTop: bs ? Math.round(bs.top) : null,
    headerFixed: bh ? Math.round(bh.top) === 0 : null,
    sidebarFixed: bs ? Math.round(bs.top) === 52 : null,
  };
});
console.log("After scroll 600px:", JSON.stringify(afterScroll, null, 2));

// Screenshot while scrolled
await page.screenshot({ path: `${OUT}/r5-scrolled-desktop.png` });
console.log("saved r5-scrolled-desktop.png");

await browser.close();
