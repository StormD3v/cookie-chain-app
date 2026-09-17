/**
 * Route timing test — Round 11 verification
 * Tests every API route against the local Express server.
 */
const WALLET = "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag";
const BASE   = "http://localhost:3001";

async function timed(label, url, init = {}) {
  const start = Date.now();
  try {
    const res = await fetch(url, init);
    const ms  = Date.now() - start;
    const body = await res.json();
    const preview = JSON.stringify(body).slice(0, 160);
    console.log(`  ${label.padEnd(38)} ${String(ms).padStart(5)}ms  HTTP ${res.status}  ${preview}`);
    return { ok: res.ok, ms, body };
  } catch (e) {
    const ms = Date.now() - start;
    console.log(`  ${label.padEnd(38)} ${String(ms).padStart(5)}ms  ERROR: ${e.message}`);
    return { ok: false, ms, error: e.message };
  }
}

console.log("\n=== Route timing — new RPC-based server ===");

await timed("GET /api/health",         `${BASE}/api/health`);
await timed("GET /api/balances",       `${BASE}/api/balances?wallet=${WALLET}`);
await timed("GET /api/activity",       `${BASE}/api/activity?wallet=${WALLET}`);

await timed("POST /api/swap/quote",    `${BASE}/api/swap/quote`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inputMint:  "So11111111111111111111111111111111111111112",
    outputMint: "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz",
    amount:     "10",
    slippageBps: 500,
  }),
});

// build and submit/confirm require a real wallet — test shape only
await timed("POST /api/swap/build (bad input)", `${BASE}/api/swap/build`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ multiRoute: null, userPublicKey: "bad" }),
});

await timed("GET /api/404-check",      `${BASE}/api/nonexistent`);

console.log("=== Done ===\n");
