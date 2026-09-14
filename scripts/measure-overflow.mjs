import { chromium } from "playwright";
import { resolve } from "node:path";
import { env } from "node:process";

const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const browser = await chromium.launch({ executablePath: CHROME });

for (const vw of [320, 337, 390]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const result = await page.evaluate((vpWidth) => {
    const docSW = document.documentElement.scrollWidth;
    const bodySW = document.body.scrollWidth;

    // Walk every element and find those overflowing right
    const offenders = [];
    document.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > vpWidth + 1) { // +1px tolerance for subpixel
        const tag = el.tagName.toLowerCase();
        const cls = Array.from(el.classList).slice(0, 2).join(".");
        const cs = getComputedStyle(el);
        offenders.push({
          id: `${tag}${cls ? "." + cls : ""}`,
          right: Math.round(r.right),
          width: Math.round(r.width),
          overflow: Math.round(r.right - vpWidth),
          whiteSpace: cs.whiteSpace,
          minWidth: cs.minWidth,
          overflowX: cs.overflowX,
        });
      }
    });

    // Deduplicate by id, keep worst offender
    const seen = {};
    for (const o of offenders) {
      if (!seen[o.id] || seen[o.id].overflow < o.overflow) seen[o.id] = o;
    }

    return {
      docScrollWidth: docSW,
      bodyScrollWidth: bodySW,
      hasScroll: docSW > vpWidth,
      offenders: Object.values(seen).sort((a, b) => b.overflow - a.overflow).slice(0, 8),
    };
  }, vw);

  const status = result.hasScroll ? "❌ OVERFLOW" : "✓ clean";
  console.log(`\n── ${vw}px  ${status}  (docScrollWidth=${result.docScrollWidth})`);
  if (result.offenders.length) {
    for (const o of result.offenders) {
      console.log(`   right=${o.right} +${o.overflow}px  ${o.id}  minW=${o.minWidth} wspc=${o.whiteSpace}`);
    }
  }

  await page.close();
}

await browser.close();
