/**
 * Injects a mock balance card into the page and measures whether
 * "3,530.641219" truncates at the current .amount font-size.
 *
 * Usage: node scripts/check-balance-card.mjs
 * Requires: npm run dev running, Playwright chromium installed
 */
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";
import { mkdir, writeFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = resolve(
  env["USERPROFILE"] ?? env["HOME"] ?? "",
  "AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe"
);
const OUT = resolve(__dirname, "../screenshots");

const TEST_STRING = "3,530.641219";

// Card widths to test — matches minmax(185px, 1fr) grid at various viewport widths
const TEST_CASES = [
  { vw: 1440, label: "desktop", cardWidth: 185 },   // worst case: small card in wide grid
  { vw: 1440, label: "desktop-wide-card", cardWidth: 350 }, // generous single-token case
  { vw: 390,  label: "mobile", cardWidth: 315 },    // single column, full width minus padding
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME });

  for (const tc of TEST_CASES) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: tc.vw, height: 900 });
    await page.goto("http://localhost:5173", { waitUntil: "networkidle" });

    // Inject a test element with the same CSS as .amount, inside a card-width container
    const result = await page.evaluate(({ cardWidth, testStr }) => {
      // Create a container matching the card inner width
      const container = document.createElement("div");
      container.style.cssText = `
        position: fixed; top: 0; left: 0; z-index: 9999;
        width: ${cardWidth}px;
        padding: 1rem 1.25rem;
        background: #231208;
        box-sizing: border-box;
      `;

      // Apply the exact .amount CSS (current values)
      const el = document.createElement("p");
      el.textContent = testStr;
      el.style.cssText = `
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 1.25rem;
        font-weight: 700;
        color: #f5e6c8;
        margin: 0;
        letter-spacing: -0.03em;
        line-height: 1.05;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-sizing: border-box;
      `;
      container.appendChild(el);
      document.body.appendChild(container);

      // Wait a tick for layout
      const innerWidth = cardWidth - (1.25 * 15 * 2); // card padding
      const scrollWidth = el.scrollWidth;
      const clientWidth = el.clientWidth;
      const isTruncated = scrollWidth > clientWidth;

      document.body.removeChild(container);

      return {
        testStr,
        cardWidth,
        innerWidth: Math.round(innerWidth),
        scrollWidth,
        clientWidth,
        isTruncated,
        fontSize: "1.25rem",
      };
    }, { cardWidth: tc.cardWidth, testStr: TEST_STRING });

    const status = result.isTruncated ? "❌ TRUNCATED" : "✓ FITS";
    console.log(`${status}  ${tc.label} (${tc.vw}px vw, ${tc.cardWidth}px card):`);
    console.log(`   text="${result.testStr}"  font=${result.fontSize}`);
    console.log(`   scrollWidth=${result.scrollWidth}px  clientWidth=${result.clientWidth}px  inner=${result.innerWidth}px`);

    await page.close();
  }

  await browser.close();
}

run().catch((err) => {
  console.error("failed:", err.message);
  process.exit(1);
});




