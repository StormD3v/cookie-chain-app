/**
 * Production smoke test — Round 11
 * Tests every API route against the deployed Vercel URL.
 */
const WALLET = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";
const BASE   = "https://cookie-chain-app-stormd3v-projects.vercel.app";

async function timed(label, url, init = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, init);
    const ms  = Date.now() - start;
    const body = await res.json();
    const preview = JSON.stringify(body).slice(0, 180);
    console.log(`  ${label.padEnd(38)} ${String(ms).padStart(5)}ms  HTTP ${res.status}  ${preview}`);
    return { ok: res.ok, ms, body, status: res.status };
  } catch (e) {
    const ms = Date.now() - start;
    console.log(`  ${label.padEnd(38)} ${String(ms).padStart(5)}ms  ERROR: ${e.message}`);
    return { ok: false, ms, error: e.message };
  }
}

console.log(`\n=== Production smoke test: ${BASE} ===`);

const health = await timed("GET /api/health",      `${BASE}/api/health`);
const bal    = await timed("GET /api/balances",     `${BASE}/api/balances?wallet=${WALLET}`);
const act    = await timed("GET /api/activity",     `${BASE}/api/activity?wallet=${WALLET}`);

const quote  = await timed("POST /api/swap/quote",  `${BASE}/api/swap/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inputMint:  "So11111111111111111111111111111111111111112",
    outputMint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz",
    amount:     "10",
    slippageBps: 500,
  }),
});

await timed("GET /api/404-check",             `${BASE}/api/nonexistent`);

// Check frontend static asset served
const fe = await fetch(`${BASE}/`);
const feMs = Date.now();
console.log(`  ${"GET / (frontend HTML)".padEnd(38)}        HTTP ${fe.status}  ${fe.ok ? "OK — frontend served" : "FAIL"}`);

console.log("\n=== Summary ===");
if (health.ok)  console.log(`  ✓ Health endpoint working`);
if (bal.ok)     console.log(`  ✓ Balances: ${bal.body?.balances?.length ?? 0} tokens returned`);
if (act.ok)     console.log(`  ✓ Activity: ${act.body?.transactions?.length ?? 0} txs returned`);
if (quote.ok)   console.log(`  ✓ Swap quote: ${quote.body?.quote?.amountIn} COOK → expectedOut=${quote.body?.quote?.expectedOut}`);
if (fe.ok)      console.log(`  ✓ Frontend HTML served`);

const allOk = health.ok && bal.ok && act.ok && quote.ok && fe.ok;
console.log(`\n  ${allOk ? "ALL ROUTES PASSING" : "SOME ROUTES FAILED"}`);
console.log("===\n");
