/**
 * Screenshots the jar hero card (mascot resting on card top-left) at both
 * desktop and mobile viewport widths using a static HTML mock.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

// Encode mascot image as data URL
const mascotBuf = await readFile(resolve(__dirname, "../src/assets/cookie-jar-hug.png"));
const mascotUrl = `data:image/png;base64,${mascotBuf.toString("base64")}`;

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  :root {
    --choco:#0f0c0a; --ganache:#321c0b; --crust:#5c3c22; --crumb:#8a6848;
    --cream:#f5e6c8; --butter:#f0c060; --success:#60c080; --error:#e05050;
    --font-display:'Syne',system-ui,sans-serif;
    --font-body:'Inter',system-ui,sans-serif;
    --font-mono:'JetBrains Mono','Courier New',monospace;
    --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-xl:22px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); font-family: var(--font-body);
    -webkit-font-smoothing: antialiased; padding: 1.5rem; }

  .jarHero { position: relative; max-width: 680px; padding-top: 4.5rem; }
  .jarMascotWrap {
    position: absolute; top: 0; left: 0;
    width: 9rem; height: 11rem;
    background: linear-gradient(to bottom, transparent 0%, transparent 4.5rem, #160903 4.5rem, #160903 100%);
    border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
    display: flex; align-items: flex-end; overflow: hidden;
    pointer-events: none; z-index: 2;
  }
  .heroMascot { width: 100%; height: auto; object-fit: cover; object-position: center bottom; display: block; }
  .jarCard {
    position: relative; z-index: 1;
    background: rgba(50,28,11,0.55);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(240,192,96,0.13);
    border-radius: var(--radius-xl); border-top-left-radius: 0;
    padding: 7rem 1.375rem 1.25rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
  }
  .jarGreetingRow {
    position: absolute; top: 0; left: 9.5rem; right: 1.375rem; height: 7rem;
    display: flex; flex-direction: column; justify-content: center; gap: 0.25rem;
  }
  .heroGreeting { font-family: var(--font-display); font-weight: 800; font-size: 1.0625rem;
    color: var(--cream); letter-spacing: -0.02em; margin: 0; line-height: 1.25; }
  .heroSub { font-size: 0.8125rem; color: var(--crumb); margin: 0; line-height: 1.4; }
  .jarCardTop { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .jarLabel { font-size: 0.625rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--crumb); margin: 0 0 0.25rem; }
  .jarUsd { font-family: var(--font-display); font-size: 2rem; font-weight: 800;
    letter-spacing: -0.04em; color: var(--cream); margin: 0; line-height: 1; }
  .jarCook { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--crumb); margin: 0.25rem 0 0; }
  .jarChange { font-size: 0.6875rem; color: var(--crumb); margin: 0.625rem 0 0; }
  @media (max-width: 480px) {
    .jarHero { padding-top: 3.5rem; }
    .jarMascotWrap { width: 7rem; height: 9rem; }
    .jarCard { padding-top: 5.75rem; }
    .jarGreetingRow { left: 7.5rem; height: 5.75rem; }
    .heroGreeting { font-size: 0.9375rem; }
  }
</style>
</head><body>

<div class="jarHero" id="card">
  <div class="jarMascotWrap">
    <img src="${mascotUrl}" alt="" class="heroMascot">
  </div>
  <section class="jarCard">
    <div class="jarGreetingRow">
      <p class="heroGreeting">Good evening, Cookie Connoisseur! 👋</p>
      <p class="heroSub">Your jar is looking healthy. Keep cooking!</p>
    </div>
    <div class="jarCardTop">
      <div>
        <p class="jarLabel">YOUR JAR</p>
        <p class="jarUsd">$0.30</p>
        <p class="jarCook">3,530.6412 COOK</p>
      </div>
      <!-- sparkline placeholder -->
      <svg viewBox="0 0 120 40" width="160" height="44" style="opacity:0.7">
        <path d="M0 35 C20 30 30 10 50 15 S90 5 120 12" fill="none" stroke="#f0c060" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <p class="jarChange">Based on recent swaps</p>
  </section>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_jar_hero.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w] of [["jar-hero-desktop", 900], ["jar-hero-mobile", 390]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 600 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const box = await page.$eval("#card", el => el.getBoundingClientRect().toJSON());
  const pad = 20;
  await page.screenshot({
    path: resolve(OUT, `${name}.png`),
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: Math.min(w, box.width + pad * 2),
      height: box.height + pad * 2,
    },
  });
  console.log(`saved ${name}.png`);
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => { });
