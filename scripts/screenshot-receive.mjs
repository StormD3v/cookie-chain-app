import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const ADDR = "Es1fXqC9abcdef1234567890abcdefABCDEF1234jXqC";

const HTML = `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;--crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;--success:#60c080;--font-display:'Syne',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--radius-xl:22px;--radius-md:10px;--radius-sm:6px;}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);}
dialog{background:transparent;border:none;padding:0;position:fixed;inset:0;margin:auto;max-width:min(460px,92vw);width:min(460px,92vw);overflow:visible;display:flex;align-items:center;justify-content:center;}
dialog::backdrop{background:rgba(6,3,1,0.82);backdrop-filter:blur(6px);}
.sheet{position:relative;width:100%;background:rgba(38,20,6,0.72);backdrop-filter:blur(18px);border:1px solid rgba(240,192,96,0.28);border-radius:var(--radius-xl);padding:1.75rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:1rem;box-shadow:0 0 0 1px rgba(240,192,96,0.08) inset,0 0 48px rgba(200,120,32,0.18),0 24px 64px rgba(0,0,0,0.7);overflow:hidden;}
.sheet::before{content:'';position:absolute;inset:4px;border:1px solid rgba(240,192,96,0.08);border-radius:calc(var(--radius-xl) - 4px);pointer-events:none;}
.sheet>*{position:relative;z-index:1;}
.hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;}
.title{font-family:var(--font-display);font-weight:800;font-size:1.125rem;letter-spacing:-.02em;margin:0;color:var(--cream);}
.close{background:transparent;border:1px solid rgba(240,192,96,0.2);border-radius:var(--radius-sm);color:var(--crumb);font-size:.875rem;padding:.25rem .5rem;cursor:pointer;line-height:1;}
.sub{font-size:.8125rem;color:var(--crumb);margin:0;line-height:1.45;}
.addrBlock{display:flex;flex-direction:column;gap:.5rem;background:rgba(0,0,0,0.35);border:1px solid rgba(240,192,96,0.1);border-radius:var(--radius-md);padding:.875rem 1rem;}
.addrLabel{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--crumb);}
.addrRow{display:flex;gap:.5rem;align-items:stretch;}
.addrInput{flex:1;min-width:0;background:transparent;border:none;color:var(--cream);font-family:var(--font-mono);font-size:.75rem;padding:0;outline:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.copyBtn{display:flex;align-items:center;gap:.35rem;padding:.45rem .875rem;background:rgba(240,192,96,0.1);border:1px solid rgba(240,192,96,0.28);border-radius:var(--radius-sm);color:var(--butter);font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;}
.copyBtnDone{background:rgba(96,192,128,0.12);border-color:rgba(96,192,128,0.4);color:var(--success);}
.addrFull{font-family:var(--font-mono);font-size:.6rem;color:var(--crumb);margin:0;word-break:break-all;line-height:1.6;opacity:.7;}
.netNote{display:flex;align-items:center;gap:.5rem;font-size:.6875rem;color:var(--crumb);opacity:.8;}
.netDot{width:6px;height:6px;border-radius:50%;background:var(--success);box-shadow:0 0 6px rgba(96,192,128,0.6);flex-shrink:0;}
</style></head><body>
<dialog id="d" open>
<div class="sheet">
  <div class="hdr"><h2 class="title">Receive</h2><button class="close">&#x2715;</button></div>
  <p class="sub">Share this address to receive COOK or any Cookie Chain token.</p>
  <div class="addrBlock">
    <span class="addrLabel">Your address</span>
    <div class="addrRow">
      <input class="addrInput" value="${ADDR}" readonly>
      <button class="copyBtn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M4.5 9.5H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5.5a1 1 0 0 1 1 1v1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Copy
      </button>
    </div>
    <p class="addrFull">${ADDR}</p>
  </div>
  <div class="netNote"><span class="netDot"></span><span>Cookie Chain only — do not send Solana assets directly</span></div>
</div>
</dialog>

<!-- Second shot: show Copied! state -->
<dialog id="d2" open style="display:none">
<div class="sheet">
  <div class="hdr"><h2 class="title">Receive</h2><button class="close">&#x2715;</button></div>
  <p class="sub">Share this address to receive COOK or any Cookie Chain token.</p>
  <div class="addrBlock">
    <span class="addrLabel">Your address</span>
    <div class="addrRow">
      <input class="addrInput" value="${ADDR}" readonly>
      <button class="copyBtn copyBtnDone">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Copied!
      </button>
    </div>
    <p class="addrFull">${ADDR}</p>
  </div>
  <div class="netNote"><span class="netDot"></span><span>Cookie Chain only — do not send Solana assets directly</span></div>
</div>
</dialog>
</body></html>`;

const htmlPath = resolve(OUT, "_receive_preview.html");
await writeFile(htmlPath, HTML, "utf8");

const browser = await chromium.launch({ executablePath: CHROME });

// Desktop — normal state
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "receive-modal-desktop.png") });
  console.log("saved receive-modal-desktop.png");
  await page.close();
}

// Mobile — normal state
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "receive-modal-mobile.png") });
  console.log("saved receive-modal-mobile.png");
  await page.close();
}

// Desktop — Copied! state — load a variant page
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  const copiedHTML = HTML.replace(
    `<dialog id="d" open>`,
    `<dialog id="d" open style="display:none"><div class="sheet"></div></dialog><dialog id="dc" open>`
  ).replace(
    `<dialog id="d2" open style="display:none">`,
    `<dialog id="d2" open>`
  );
  const copiedPath = resolve(OUT, "_receive_copied.html");
  await writeFile(copiedPath, copiedHTML, "utf8");
  await page.goto(`file://${copiedPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "receive-modal-copied.png") });
  console.log("saved receive-modal-copied.png");
  await page.close();
  await unlink(copiedPath).catch(() => { });
}

await browser.close();
await unlink(htmlPath).catch(() => { });
