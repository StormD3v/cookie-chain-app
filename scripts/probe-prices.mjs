/**
 * Price source investigation — Round 12
 * Probes every plausible price endpoint on Cookie Chain ecosystem APIs.
 */

async function get(label, url, timeoutMs = 12000) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("json")) {
      const b = await r.json();
      console.log(`\n[${r.status}] ${label}`);
      console.log(JSON.stringify(b).slice(0, 600));
      return b;
    } else {
      const t = await r.text();
      console.log(`\n[${r.status}] ${label} — not JSON`);
      console.log(t.slice(0, 120));
      return null;
    }
  } catch (e) {
    console.log(`\n[ERR] ${label}: ${e.message}`);
    return null;
  }
}

const COOK  = "So11111111111111111111111111111111111111112";
const bCOOK = "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz";
const CHAT  = "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q";

// ── 1. Candy Shop /tokens — already confirmed working ────────────────────────
const tokens = await get("Candy Shop GET /tokens", "https://swap.cookiescan.io/api/tokens");
if (Array.isArray(tokens)) {
  console.log(`\nAll ${tokens.length} tokens on Candy Shop:`);
  for (const t of tokens) {
    console.log(`  ${t.symbol.padEnd(8)} ${t.mint.slice(0,10)}  priceUsd=${t.priceUsd}  quote=${t.quote_symbol}`);
  }
  const bCookTok = tokens.find(t => t.mint === bCOOK);
  const chatTok  = tokens.find(t => t.mint === CHAT);
  const cookTok  = tokens.find(t => t.mint === COOK);
  console.log("\nbCOOK in list:", !!bCookTok, "priceUsd:", bCookTok?.priceUsd);
  console.log("CHAT  in list:", !!chatTok,  "priceUsd:", chatTok?.priceUsd);
  console.log("COOK  in list:", !!cookTok,  "(native — expected to be absent)");
}

// ── 2. Is COOK price exposed anywhere? ──────────────────────────────────────
// The /tokens response uses priceUsd directly. Since all tokens are quoted in COOK,
// priceUsd implies Candy Shop knows COOK's USD value. Try to find that endpoint.
await get("Candy Shop GET /price", "https://swap.cookiescan.io/api/price");
await get("Candy Shop GET /price/native", "https://swap.cookiescan.io/api/price/native");
await get("Candy Shop GET /price?symbol=COOK", "https://swap.cookiescan.io/api/price?symbol=COOK");
await get("Candy Shop GET /price?mint=" + COOK, "https://swap.cookiescan.io/api/price?mint=" + COOK);
await get("Candy Shop GET /stats", "https://swap.cookiescan.io/api/stats");
await get("Candy Shop GET /market", "https://swap.cookiescan.io/api/market");
await get("Candy Shop GET /market?mint=" + COOK, "https://swap.cookiescan.io/api/market?mint=" + COOK);

// ── 3. CookieScan explorer API ───────────────────────────────────────────────
await get("CookieScan GET /api/v1/price", "https://cookiescan.io/api/v1/price");
await get("CookieScan GET /api/v1/tokens", "https://cookiescan.io/api/v1/tokens");
await get("CookieScan GET /api/v1/stats", "https://cookiescan.io/api/v1/stats");
await get("CookieScan GET /api/v1/token/" + COOK, `https://cookiescan.io/api/v1/token/${COOK}`);

// ── 4. Cookiebox ─────────────────────────────────────────────────────────────
await get("Cookiebox GET /api/price", "https://cookiebox.xyz/api/price");
await get("Cookiebox GET /api/tokens", "https://cookiebox.xyz/api/tokens");
await get("Cookiebox GET /api/v1/price", "https://cookiebox.xyz/api/v1/price");

// ── 5. Derive COOK USD from quote: 1 COOK → how much of a stable? ────────────
// There's no USDC on Cookie Chain in the /tokens list.
// But bCOOK.priceUsd / bCOOK.priceNative would give us COOK USD if priceNative = bCOOK/COOK
// bCOOK.priceNative = 1.328 means 1 COOK = 1.328 bCOOK? or 1 bCOOK = 1.328 COOK?
if (Array.isArray(tokens)) {
  const b = tokens.find(t => t.mint === bCOOK);
  if (b) {
    console.log("\n\n── COOK USD price derivation ──");
    console.log("bCOOK.priceUsd:", b.priceUsd);
    console.log("bCOOK.priceNative:", b.priceNative, "(COOK per bCOOK)");
    // If priceNative = COOK per bCOOK, then:
    // COOK_USD = bCOOK.priceUsd / bCOOK.priceNative (if priceNative = COOK/bCOOK)
    // OR COOK_USD = bCOOK.priceUsd * bCOOK.priceNative (if priceNative = bCOOK/COOK)
    // Sanity check with actual quote: 1 COOK → 0.7537 bCOOK
    // So 1 bCOOK ≈ 1/0.7537 = 1.327 COOK → priceNative is COOK per bCOOK
    // Therefore COOK_USD = bCOOK.priceUsd / bCOOK.priceNative
    const cookUsd = b.priceUsd / b.priceNative;
    console.log("Derived COOK_USD = bCOOK.priceUsd / bCOOK.priceNative =", cookUsd);
    console.log("i.e. 1 COOK ≈ $" + cookUsd.toFixed(6));
  }
}
