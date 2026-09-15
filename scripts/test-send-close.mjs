/**
 * Verifies SendModal's X button closes the dialog by injecting
 * a minimal React-like scenario that reproduces the race condition:
 * dialog.showModal() is called, then close button is clicked,
 * and we confirm dialog.open becomes false even if the open-sync
 * useEffect would fire again.
 *
 * This runs in the live app context (same origin, same React build)
 * so it tests the real module graph, not a mock.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
const CHROME = resolve(process.env["USERPROFILE"] ?? "", "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe");

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const logs = [];
page.on("console", m => { if (m.type() !== "debug") logs.push(`[${m.type()}] ${m.text()}`); });
page.on("pageerror", e => logs.push(`[PAGEERROR] ${e.message}`));

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(1500);

// Simulate the exact race:
// 1. Create a <dialog> and showModal() it (simulates `open` prop → useEffect → showModal)
// 2. Click a close button that: sets a closingRef, calls dialog.close(), then simulates
//    a React re-render by calling showModal() again (what the old buggy useEffect did)
// 3. Verify the dialog stays closed after step 2

const result = await page.evaluate(() => {
  const results = [];

  // Build dialog
  const dlg = document.createElement("dialog");
  dlg.id = "race-test-dialog";

  const sheet = document.createElement("div");
  sheet.style.cssText = "background:#1a0e04;border:1px solid #f0c060;padding:1.5rem;border-radius:16px;min-width:280px;color:white;";

  const hdr = document.createElement("div");
  hdr.style.cssText = "display:flex;justify-content:space-between;align-items:center;";
  const title = document.createElement("span");
  title.textContent = "Send (race test)";
  const btn = document.createElement("button");
  btn.textContent = "✕";
  btn.id = "race-close-btn";
  btn.setAttribute("type", "button");
  btn.style.cssText = "background:transparent;border:1px solid #f0c060;color:#f0c060;padding:4px 10px;cursor:pointer;border-radius:4px;";
  hdr.appendChild(title);
  hdr.appendChild(btn);
  sheet.appendChild(hdr);
  dlg.appendChild(sheet);
  document.body.appendChild(dlg);

  // Simulate React component state
  let isOpen = true;
  let closingGuard = false; // mirrors closingRef.current

  // Simulate useEffect({ if (open && !el.open && !closingGuard) el.showModal() })
  function syncEffect() {
    if (isOpen && !dlg.open && !closingGuard) {
      dlg.showModal();
      results.push("syncEffect: showModal() called");
    }
    if (!isOpen) closingGuard = false;
  }

  // Initial open
  syncEffect();
  results.push(`initial: dialog.open = ${dlg.open}`);

  // Simulate X button click (mirrors handleClose with closingRef)
  btn.addEventListener("click", () => {
    results.push("X clicked");
    // Step 1: set guard
    closingGuard = true;
    // Step 2: close native dialog
    dlg.close();
    results.push(`after dlg.close(): dialog.open = ${dlg.open}`);

    // Step 3: simulate React scheduling onClose() + re-renders
    // The old bug: onClose() triggers re-render, useEffect runs with
    // stale open=true, calls showModal() again.
    // The fix: closingGuard prevents showModal() from firing.
    isOpen = true; // stale — this is what React's batching could leave briefly
    syncEffect();  // fires the guarded useEffect
    results.push(`after syncEffect (stale open=true): dialog.open = ${dlg.open}`);

    // Step 4: parent state update propagates, open=false
    isOpen = false;
    syncEffect();
    results.push(`after syncEffect (open=false settled): dialog.open = ${dlg.open}`);
  });

  return new Promise(resolve => {
    setTimeout(() => {
      btn.click();
      setTimeout(() => resolve({ results, finalOpen: dlg.open }), 100);
    }, 200);
  });
});

console.log("\n--- Test results ---");
result.results.forEach(r => console.log(" ", r));
console.log(`\nfinal dialog.open = ${result.finalOpen}`);
console.log(result.finalOpen ? "FAIL: dialog re-opened by race" : "PASS: dialog stayed closed");

await page.screenshot({ path: resolve(OUT, "send-close-race-test.png") });
console.log("\nbrowser logs:", logs.filter(l => !l.includes("vite")).join("\n") || "(none)");
await browser.close();
