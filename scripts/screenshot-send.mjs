/**
 * Static preview screenshots of the SendModal UI.
 * NOTE: This is a hand-built static preview — not the live connected app.
 * A real send requires a connected Nightly wallet to sign; that cannot be
 * automated. The static preview proves the modal renders correctly at both
 * viewports. End-to-end send testing requires a human to connect a wallet
 * and sign in the actual running app.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const logoDir = resolve(__dirname, "../public/logos");
const logoUrl = (n) => `file:///${logoDir.replace(/\\/g, "/")}/${n}`;

const HTML = `<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--choco:#0f0c0a;--ganache:#321c0b;--truffle:#3e2612;--crust:#5c3c22;--crumb:#8a6848;--cream:#f5e6c8;--butter:#f0c060;--caramel:#c87820;--error:#e05050;--success:#60c080;--chip:#7c4a1e;--font-display:'Syne',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif;--font-mono:'JetBrains Mono',monospace;--radius-xl:22px;--radius-md:10px;--radius-sm:6px;}
*,*::before,*::after{box-sizing:border-box;}
body{margin:0;background:var(--choco);color:var(--cream);font-family:var(--font-body);}
dialog{background:transparent;border:none;padding:0;position:fixed;inset:0;margin:auto;max-width:min(480px,92vw);width:min(480px,92vw);overflow:visible;display:flex;align-items:center;justify-content:center;}
dialog::backdrop{background:rgba(6,3,1,0.82);backdrop-filter:blur(6px);}
.sheet{position:relative;width:100%;background:rgba(38,20,6,0.72);backdrop-filter:blur(18px);border:1px solid rgba(240,192,96,0.28);border-radius:var(--radius-xl);padding:1.75rem 1.5rem 1.5rem;display:flex;flex-direction:column;gap:1rem;box-shadow:0 0 0 1px rgba(240,192,96,0.08) inset,0 0 48px rgba(200,120,32,0.18),0 24px 64px rgba(0,0,0,0.7);overflow:hidden;}
.sheet::before{content:'';position:absolute;inset:4px;border:1px solid rgba(240,192,96,0.08);border-radius:calc(var(--radius-xl) - 4px);pointer-events:none;}
.sheet>*{position:relative;z-index:1;}
.hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;}
.title{font-family:var(--font-display);font-weight:800;font-size:1.125rem;letter-spacing:-.02em;margin:0;color:var(--cream);}
.close{background:transparent;border:1px solid rgba(240,192,96,0.2);border-radius:var(--radius-sm);color:var(--crumb);font-size:.875rem;padding:.25rem .5rem;cursor:pointer;line-height:1;}
.form{display:flex;flex-direction:column;gap:.875rem;}
.field{display:flex;flex-direction:column;gap:.3rem;}
.lbl{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--crumb);}
.inp{width:100%;background:rgba(0,0,0,0.35);border:1px solid rgba(240,192,96,0.15);border-radius:var(--radius-md);color:var(--cream);font-family:var(--font-mono);font-size:.875rem;padding:.625rem .75rem;outline:none;box-sizing:border-box;}
.inp::placeholder{color:var(--chip);}
.tok-wrap{position:relative;display:flex;align-items:center;background:rgba(0,0,0,0.35);border:1px solid rgba(240,192,96,0.15);border-radius:var(--radius-md);overflow:hidden;}
.tok-logo{width:1.5rem;height:1.5rem;border-radius:50%;margin-left:.625rem;flex-shrink:0;}
.tok-sel{flex:1;background:transparent;border:none;color:var(--cream);font-family:var(--font-body);font-size:.9375rem;font-weight:600;padding:.625rem .75rem;outline:none;}
.tok-wrap::after{content:'▾';position:absolute;right:.75rem;color:var(--crumb);pointer-events:none;font-size:.75rem;}
.bal{font-size:.6875rem;color:var(--crumb);margin:0;}
.bal span{color:var(--butter);font-weight:600;}
.amt-row{position:relative;display:flex;align-items:center;}
.amt-row .inp{padding-right:4.5rem;}
.amt-sym{position:absolute;right:.75rem;font-size:.75rem;font-weight:700;color:var(--butter);pointer-events:none;}
.ata{display:flex;align-items:flex-start;gap:.5rem;padding:.625rem .875rem;background:rgba(200,120,32,0.1);border:1px solid rgba(200,120,32,0.3);border-radius:var(--radius-md);font-size:.75rem;color:var(--caramel);line-height:1.45;}
.send-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;width:100%;padding:.9375rem;background:var(--butter);color:var(--choco);font-weight:700;font-size:.9375rem;border:none;border-radius:var(--radius-md);cursor:pointer;box-shadow:0 4px 20px rgba(240,192,96,0.3);margin-top:.25rem;}
</style></head><body>

<!-- Normal state -->
<dialog id="d1" open>
<div class="sheet">
  <div class="hdr"><h2 class="title">Send</h2><button class="close">&#x2715;</button></div>
  <div class="form">
    <div class="field">
      <span class="lbl">Token</span>
      <div class="tok-wrap">
        <img src="${logoUrl("cook.svg")}" class="tok-logo" alt="">
        <select class="tok-sel"><option>COOK</option><option>bCOOK</option><option>CHAT</option></select>
      </div>
      <p class="bal">Available: <span>3,530.6412 COOK</span></p>
    </div>
    <div class="field">
      <span class="lbl">Recipient address</span>
      <input class="inp" placeholder="Base58 address…" value="">
    </div>
    <div class="field">
      <span class="lbl">Amount</span>
      <div class="amt-row"><input class="inp" placeholder="0.00" value="10"><span class="amt-sym">COOK</span></div>
    </div>
    <button class="send-btn">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M13 3H7M13 3v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Send
    </button>
  </div>
</div>
</dialog>

</body></html>`;

const htmlPath = resolve(OUT, "_send_preview.html");
await writeFile(htmlPath, HTML, "utf8");
const browser = await chromium.launch({ executablePath: CHROME });

// Desktop
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "send-modal-desktop.png") });
  console.log("saved send-modal-desktop.png");
  await page.close();
}

// Mobile
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "send-modal-mobile.png") });
  console.log("saved send-modal-mobile.png");
  await page.close();
}

// ATA creation notice state
const ataHTML = HTML.replace('value="">', 'value="9Gg3m2vRFDHPfYvp123exampleRecipientXYZ123">').replace(
  '<button class="send-btn">',
  `<div class="ata"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3"/><path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg><span>Recipient has no COOK account. Creating it adds ~0.0021 COOK rent to this transaction.</span></div>\n    <button class="send-btn">`
);
const ataPath = resolve(OUT, "_send_ata.html");
await writeFile(ataPath, ataHTML, "utf8");
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`file://${ataPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(OUT, "send-modal-ata-notice.png") });
  console.log("saved send-modal-ata-notice.png");
  await page.close();
}

// Dev server — confirm no error overlay (disconnected state)
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:5174/", { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: resolve(OUT, "live-no-error.png") });
  console.log("saved live-no-error.png");
  await page.close();
}

await browser.close();
await unlink(htmlPath).catch(() => {});
await unlink(ataPath).catch(() => {});
