/**
 * Screenshots the TxDetailModal (status window) in its open state
 * by injecting the modal HTML directly into a test page.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const HTML = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --choco:#0f0c0a; --ganache:#321c0b; --truffle:#3e2612; --crust:#5c3c22;
  --crumb:#8a6848; --cream:#f5e6c8; --butter:#f0c060; --caramel:#c87820;
  --chip:#7c4a1e; --error:#e05050; --success:#60c080; --sky:#4a9eba;
  --font-display:'Syne',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --font-mono:'JetBrains Mono','Fira Code',monospace;
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px; --radius-xl:22px;
}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);font-size:15px;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;align-items:center;justify-content:center;}

/* Backdrop simulation */
.backdrop {
  position:fixed;inset:0;
  background:rgba(6,3,1,0.82);
  backdrop-filter:blur(6px);
  -webkit-backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;
}

/* Status window card — mirrors TxDetailModal.module.css */
.sheet {
  position:relative;
  width:min(480px,92vw);
  background:rgba(38,20,6,0.72);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  border:1px solid rgba(240,192,96,0.28);
  border-radius:var(--radius-xl);
  padding:1.75rem 1.5rem 1.5rem;
  display:flex;
  flex-direction:column;
  gap:1rem;
  box-shadow:
    0 0 0 1px rgba(240,192,96,0.08) inset,
    0 0 48px rgba(200,120,32,0.18),
    0 24px 64px rgba(0,0,0,0.7),
    0 8px 24px rgba(0,0,0,0.5);
  overflow:hidden;
  animation:statusIn 0.3s cubic-bezier(0.34,1.45,0.64,1);
}
@keyframes statusIn {
  from{opacity:0;transform:scale(0.85) translateY(8px);}
  to{opacity:1;transform:scale(1) translateY(0);}
}
.sheet::before {
  content:'';position:absolute;inset:4px;
  border:1px solid rgba(240,192,96,0.08);
  border-radius:calc(var(--radius-xl) - 4px);
  pointer-events:none;z-index:0;
}
.sheet::after {
  content:'';position:absolute;bottom:-8px;left:50%;
  transform:translateX(-50%);
  width:4px;height:4px;border-radius:50%;
  background:rgba(240,192,96,0.45);
  box-shadow:
    -60px -20px 0 rgba(200,120,32,0.3),
     40px -50px 0 rgba(240,192,96,0.25),
    -100px -80px 0 rgba(200,120,32,0.2),
     80px -110px 0 rgba(240,192,96,0.15),
    -20px -140px 0 rgba(200,120,32,0.18),
     60px -170px 0 rgba(240,192,96,0.12);
  animation:crumbDrift 4s ease-in-out infinite;
  pointer-events:none;z-index:0;
}
@keyframes crumbDrift {
  0%,100%{transform:translateX(-50%) translateY(0) rotate(0deg);opacity:1;}
  50%{transform:translateX(-46%) translateY(-18px) rotate(15deg);opacity:0.6;}
}
.sheet>*{position:relative;z-index:1;}

.header{display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;}
.title{font-family:var(--font-display);font-weight:800;font-size:1.125rem;letter-spacing:-0.02em;margin:0;color:var(--cream);}
.closeBtn{background:transparent;border:1px solid rgba(240,192,96,0.2);border-radius:var(--radius-sm);color:var(--crumb);font-size:0.875rem;padding:0.25rem 0.5rem;cursor:pointer;line-height:1;}

.amountHero{font-family:var(--font-mono);font-size:1.625rem;font-weight:700;color:var(--butter);text-shadow:0 0 24px rgba(240,192,96,0.35);letter-spacing:-0.02em;margin:0;line-height:1.1;}

.details{margin:0;display:flex;flex-direction:column;gap:0.5rem;background:rgba(0,0,0,0.35);border:1px solid rgba(240,192,96,0.1);border-radius:var(--radius-md);padding:0.875rem 1rem;}
.row{display:flex;justify-content:space-between;align-items:baseline;gap:0.5rem;font-size:0.8125rem;}
.row dt{color:var(--crumb);font-weight:400;flex-shrink:0;text-transform:uppercase;font-size:0.6875rem;letter-spacing:0.06em;}
.row dd{margin:0;color:var(--cream);text-align:right;word-break:break-all;}
.mono{font-family:var(--font-mono);font-size:0.75rem;letter-spacing:-0.01em;}
.ok{color:var(--sky);font-weight:700;text-shadow:0 0 12px rgba(74,158,186,0.4);}

.explorerBtn{display:flex;align-items:center;justify-content:center;padding:0.8125rem 1rem;background:rgba(240,192,96,0.08);color:var(--butter);font-family:var(--font-body);font-weight:600;font-size:0.875rem;text-decoration:none;border:1px solid rgba(240,192,96,0.25);border-radius:var(--radius-md);}
</style></head>
<body>
<div class="backdrop">
  <div class="sheet">
    <div class="header">
      <h2 class="title">Swap</h2>
      <button class="closeBtn">✕</button>
    </div>
    <p class="amountHero">10 COOK → 7.570 bCOOK</p>
    <dl class="details">
      <div class="row"><dt>Status</dt><dd><span class="ok">✓ Confirmed</span></dd></div>
      <div class="row"><dt>Date</dt><dd>Sep 14, 2026, 11:26:05 AM</dd></div>
      <div class="row"><dt>Slot</dt><dd class="mono">25,068,396</dd></div>
      <div class="row"><dt>Signature</dt><dd class="mono">4ZXUoqbWxHag…mN4m3q</dd></div>
    </dl>
    <a class="explorerBtn" href="#">View on Cookiescan ↗</a>
  </div>
</div>
</body></html>`;

const htmlPath = resolve(OUT, "_modal_preview.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

for (const [name, w, h] of [["modal-desktop", 1440, 900], ["modal-mobile", 390, 844]]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const out = resolve(OUT, `${name}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
