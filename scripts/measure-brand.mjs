import { chromium } from "playwright";
import { resolve } from "node:path";
import { env } from "node:process";

const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });
await page.setContent(`<!DOCTYPE html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0f0c0a;font-family:'Syne',sans-serif;}
.brand{display:flex;align-items:center;gap:0.625rem;padding:1.25rem 1rem 1rem;width:220px;border:1px solid red;}
.logo{font-size:1.75rem;line-height:1;flex-shrink:0;border:1px solid blue;}
.text{flex:1;min-width:0;overflow:hidden;border:1px solid green;}
.name{font-weight:800;font-size:0.9375rem;letter-spacing:-0.02em;white-space:nowrap;color:white;}
</style></head><body>
<div class="brand" id="brand">
  <span class="logo" id="logo">🍪</span>
  <div class="text" id="text"><span class="name" id="name">Cookie Chain</span></div>
</div>
</body></html>`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const result = await page.evaluate(() => {
  const brand  = document.getElementById("brand");
  const logo   = document.getElementById("logo");
  const text   = document.getElementById("text");
  const name   = document.getElementById("name");
  const gap    = parseFloat(getComputedStyle(brand).gap);
  const padL   = parseFloat(getComputedStyle(brand).paddingLeft);
  const padR   = parseFloat(getComputedStyle(brand).paddingRight);
  return {
    brandW:      brand.getBoundingClientRect().width,
    logoW:       logo.getBoundingClientRect().width,
    textW:       text.getBoundingClientRect().width,
    nameScrollW: name.scrollWidth,
    nameClientW: name.getBoundingClientRect().width,
    gap, padL, padR,
    isClipped: name.scrollWidth > name.getBoundingClientRect().width,
  };
});

console.log(JSON.stringify(result, null, 2));
console.log(`\nSpace used: padL(${result.padL}) + logo(${result.logoW}) + gap(${result.gap}) + text(${result.textW}) + padR(${result.padR}) = ${result.padL + result.logoW + result.gap + result.textW + result.padR}`);
console.log(`Name needs: ${result.nameScrollW}px, has: ${result.nameClientW}px — CLIPPED: ${result.isClipped}`);
await browser.close();
