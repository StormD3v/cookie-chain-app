import { chromium } from "playwright";
import { resolve } from "node:path";
import { env } from "node:process";

const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);

const browser = await chromium.launch({ executablePath: CHROME });

for (const vw of [1440, 390]) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: vw, height: 900 });
  await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

  const result = await page.evaluate(() => {
    // Find the bannerTitle span via its absolute-positioned parent
    const allSpans = Array.from(document.querySelectorAll("span"));
    const titleSpan = allSpans.find((s) => {
      if (s.textContent.trim() !== "Cookie Chain") return false;
      const parent = s.parentElement;
      return parent && getComputedStyle(parent).position === "absolute";
    });
    if (!titleSpan) return { error: "bannerTitle span not found" };

    const overlay = titleSpan.parentElement;     // absolute-positioned overlay div
    const bannerWrap = overlay?.parentElement;   // the overflow:hidden wrapper

    const spanR = titleSpan.getBoundingClientRect();
    const overlayR = overlay ? overlay.getBoundingClientRect() : null;
    const wrapR = bannerWrap ? bannerWrap.getBoundingClientRect() : null;

    // The text clips visually if the span's right edge exceeds bannerWrap's right edge
    const spanRight = Math.round(spanR.right);
    const wrapRight = wrapR ? Math.round(wrapR.right) : null;
    const isClippedByWrap = wrapRight !== null && spanRight > wrapRight;

    return {
      spanLeft: Math.round(spanR.left),
      spanRight,
      spanWidth: Math.round(spanR.width),
      spanScrollW: titleSpan.scrollWidth,
      overlayLeft: overlayR ? Math.round(overlayR.left) : null,
      overlayRight: overlayR ? Math.round(overlayR.right) : null,
      overlayWidth: overlayR ? Math.round(overlayR.width) : null,
      wrapLeft: wrapR ? Math.round(wrapR.left) : null,
      wrapRight,
      wrapWidth: wrapR ? Math.round(wrapR.width) : null,
      fontSize: getComputedStyle(titleSpan).fontSize,
      isClippedByWrap,
    };
  });

  console.log(`\n── ${vw}px ──────────────────────────────`);
  if (result.error) { console.log(" ERROR:", result.error); }
  else {
    const clip = result.isClippedByWrap ? "❌ CLIPPED BY WRAP" : "✓ fits within wrap";
    console.log(` ${clip}`);
    console.log(` span:     left=${result.spanLeft} right=${result.spanRight} width=${result.spanWidth}  scrollW=${result.spanScrollW}`);
    console.log(` overlay:  left=${result.overlayLeft} right=${result.overlayRight} width=${result.overlayWidth}`);
    console.log(` bannerWrap: left=${result.wrapLeft} right=${result.wrapRight} width=${result.wrapWidth}`);
    console.log(` font-size: ${result.fontSize}`);
  }

  await page.close();
}

await browser.close();
