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
await page.goto(`http://localhost:5174/?preview=${ADDR}`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(2000);

// Crop the bottom 220px of the sidebar
const aside = await page.$("aside");
const box = aside ? await aside.boundingBox() : { x: 0, y: 0, width: 240, height: 900 };
const cropH = 220;
await page.screenshot({
  path: resolve(OUT, "bridge-page.png"),
  clip: { x: box.x, y: box.y + box.height - cropH, width: box.width, height: cropH },
});
console.log("saved bridge-page.png");
await browser.close();
