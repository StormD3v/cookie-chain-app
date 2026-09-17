/**
 * Screenshots the quick action button row at desktop and mobile widths.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --choco:#0f0c0a; --ganache:#321c0b; --crust:#5c3c22; --crumb:#8a6848;
    --cream:#f5e6c8; --butter:#f0c060; --caramel:#c87820;
    --font-body:'Inter',system-ui,sans-serif;
    --font-display:'Syne',system-ui,sans-serif;
    --radius-lg:16px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; background: var(--choco); font-family: var(--font-body); -webkit-font-smoothing: antialiased; padding: 1.5rem; }

  .quickActions {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.625rem;
  }

  /* Secondary buttons */
  .qaBtn {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0.4rem; padding: 0.875rem 0.5rem;
    background: rgba(50,28,11,0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(240,192,96,0.22);
    border-radius: var(--radius-lg);
    color: var(--crumb);
    font-family: var(--font-body); font-size: 0.75rem; font-weight: 500;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }

  /* Primary = Bake Swap */
  .qaBtnPrimary {
    background: var(--butter);
    border-color: var(--butter);
    color: var(--choco);
    font-weight: 700;
    box-shadow: 0 2px 16px rgba(240,192,96,0.35), 0 2px 8px rgba(0,0,0,0.3);
  }

  .qaIcon { display: flex; align-items: center; justify-content: center; }
  .qaLabel { white-space: nowrap; font-size: 0.75rem; }

  @media (max-width: 540px) {
    .quickActions { gap: 0.5rem; }
    .qaBtn { padding: 0.75rem 0.25rem; font-size: 0.6875rem; }
    .qaLabel { font-size: 0.6875rem; }
  }
</style>
</head><body>

<div class="quickActions" id="actions">
  <!-- Send -->
  <button class="qaBtn">
    <span class="qaIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 16L16 4M16 4H8M16 4v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span class="qaLabel">Send</span>
  </button>

  <!-- Receive -->
  <button class="qaBtn">
    <span class="qaIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M16 4L4 16M4 16h8M4 16V8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span class="qaLabel">Receive</span>
  </button>

  <!-- Bake Swap — primary -->
  <button class="qaBtn qaBtnPrimary">
    <span class="qaIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 7h14M14 3l3 4-3 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 13H3M6 17l-3-4 3-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
    <span class="qaLabel">Bake Swap</span>
  </button>

  <!-- Bridge -->
  <button class="qaBtn">
    <span class="qaIcon">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M2 14c0-4.42 3.58-8 8-8 2.21 0 4.21.9 5.66 2.34" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M18 14c0-4.42-3.58-8-8-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M2 14h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M5 14v2M10 14v2M15 14v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </span>
    <span class="qaLabel">Bridge</span>
  </button>
</div>

</body></html>`;

const htmlPath = resolve(OUT, "_actions.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [label, w] of [["desktop", 900], ["mobile", 390]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: 300 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const box = await page.$eval("#actions", el => el.getBoundingClientRect().toJSON());
  const pad = 16;
  await page.screenshot({
    path: resolve(OUT, `actions-${label}.png`),
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(w, box.width + pad*2), height: box.height + pad*2 },
  });
  console.log(`saved actions-${label}.png`);
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
