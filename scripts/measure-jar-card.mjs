/**
 * measure-jar-card.mjs  — Round 9 verification
 *
 * Measures jarCard height at 1440 / 768 / 390 px, checks for horizontal
 * scrollbar at all three widths, counts Crumbs rows, checks the pctChange
 * badge, and takes screenshots at 1440px and 390px.
 *
 * Requires Vite to be running with VITE_PREVIEW_WALLET env var set.
 * NOTE: Preview wallet has 0 transactions — Crumbs shows "No crumbs yet."
 * pctChange pill will not appear (< 3 confirmed txs). This is expected.
 * Real wallet verification requires connecting in the browser manually.
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../screenshots");
await mkdir(OUT, { recursive: true });

const CHROME = resolve(
  env["USERPROFILE"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);
const BASE = "http://localhost:5174/";

const browser = await chromium.launch({ executablePath: CHROME });

async function measure(label, w, h, screenshot) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: w, height: h });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    // jarCard: section whose class includes "jarCard"
    const jarCard = [...document.querySelectorAll("section")]
      .find(s => s.className.includes("jarCard"));
    const jarRect = jarCard ? jarCard.getBoundingClientRect() : null;

    // Horizontal overflow
    const scrollW = document.documentElement.scrollWidth;
    const clientW = document.documentElement.clientWidth;

    // Crumbs rows
    const crumbRows = [...document.querySelectorAll("li")]
      .filter(li => li.className.includes("crumbRow"));
    const crumbsLoading = !!document.querySelector('[class*="crumbsLoading"]');
    const emptyMsgs = [...document.querySelectorAll("p")]
      .filter(p => p.className.includes("emptyMsg"))
      .map(p => p.textContent?.trim());

    // pctChange badge — span inside jarUsd
    const badge = document.querySelector('[class*="jarChangeBadge"]');

    // Confirm no sparklinePlaceholder, sparklineSvg, timeRangeTabs exist in DOM
    const hasSparkPlaceholder = !!document.querySelector('[class*="sparklinePlaceholder"]');
    const hasSparkSvg = !!document.querySelector('[class*="sparklineSvg"]');
    const hasTimeRangeTabs = !!document.querySelector('[class*="timeRangeTabs"]');

    return {
      jarCardH: jarRect ? Math.round(jarRect.height) : null,
      jarCardW: jarRect ? Math.round(jarRect.width) : null,
      scrollW,
      clientW,
      hScroll: scrollW > clientW,
      crumbCount: crumbRows.length,
      crumbsLoading,
      emptyMsgs,
      badgeText: badge ? badge.textContent?.trim() : null,
      hasSparkPlaceholder,
      hasSparkSvg,
      hasTimeRangeTabs,
    };
  });

  console.log(`\n── ${label} (${w}×${h}) ──`);
  console.log(`  jarCard height : ${result.jarCardH}px  (width: ${result.jarCardW}px)`);
  console.log(`  H-scroll       : ${result.hScroll}  (scrollW=${result.scrollW}, clientW=${result.clientW})`);
  console.log(`  Crumbs rows    : ${result.crumbCount}${result.crumbsLoading ? " (loading)" : ""}`);
  if (result.emptyMsgs.length) console.log(`  Empty messages : ${result.emptyMsgs.join(" | ")}`);
  console.log(`  pctChange pill : ${result.badgeText ?? "not visible (< 3 confirmed txs — expected)"}`);
  console.log(`  DOM chart remnants:`);
  console.log(`    sparklinePlaceholder: ${result.hasSparkPlaceholder}`);
  console.log(`    sparklineSvg:         ${result.hasSparkSvg}`);
  console.log(`    timeRangeTabs:        ${result.hasTimeRangeTabs}`);

  if (screenshot) {
    const fname = `r9-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
    await page.screenshot({ path: resolve(OUT, fname), fullPage: false });
    console.log(`  screenshot     : screenshots/${fname}`);
  }

  await page.close();
  return result;
}

const desktop = await measure("desktop-1440", 1440, 900, true);
const tablet = await measure("tablet-768", 768, 1024, false);
const mobile = await measure("mobile-390", 390, 844, true);

await browser.close();

console.log("\n════════════════════════════════════════════════");
console.log("SUMMARY");
console.log("════════════════════════════════════════════════");
console.log(`Desktop 1440px  jarCard h = ${desktop.jarCardH}px   H-scroll = ${desktop.hScroll}`);
console.log(`Tablet   768px  jarCard h = ${tablet.jarCardH}px   H-scroll = ${tablet.hScroll}`);
console.log(`Mobile   390px  jarCard h = ${mobile.jarCardH}px   H-scroll = ${mobile.hScroll}`);
console.log(`DOM chart remnants (desktop): sparklinePlaceholder=${desktop.hasSparkPlaceholder} sparklineSvg=${desktop.hasSparkSvg} timeRangeTabs=${desktop.hasTimeRangeTabs}`);
console.log(`Crumbs (desktop) : ${desktop.crumbCount} rows`);
console.log(`pctChange pill   : ${desktop.badgeText ?? "not shown — preview wallet has 0 txs (expected)"}`);
console.log(`\nNOTE: Preview wallet (Es1f5...) has 0 transactions.`);
console.log(`Crumbs 'No crumbs yet.' confirms component renders.`);
console.log(`pctChange requires ≥3 confirmed txs — not shown with preview wallet.`);
console.log(`Connect live wallet in browser to verify both.`);
