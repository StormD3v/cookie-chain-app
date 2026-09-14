/**
 * Calls cookie-mcp directly (no Express) to:
 *  1. get_pools  — list all pools with liquidity info
 *  2. get_quote  — try COOK↔USDC, COOK↔bCOOK, COOK↔stake
 * Reports exactly what routes exist on Chain right now.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "node:process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN_EXT = process.platform === "win32" ? ".cmd" : "";
const BIN = resolve(__dirname, `../node_modules/.bin/cookie-mcp${BIN_EXT}`);

const parentEnv = Object.fromEntries(
  Object.entries(env).filter(([, v]) => v != null)
);

const transport = new StdioClientTransport({
  command: BIN,
  args: [],
  env: { ...parentEnv, COOKIE_RPC_URL: "https://rpc.cookiescan.io" },
});

const client = new Client({ name: "pool-check", version: "0.0.1" }, { capabilities: {} });
await client.connect(transport);
await new Promise(r => setTimeout(r, 3500)); // settle

async function call(tool, args = {}) {
  const res = await client.callTool({ name: tool, arguments: args });
  const text = res.content?.find(b => b.type === "text")?.text ?? "{}";
  return JSON.parse(text);
}

// ── 1. chain health ────────────────────────────────────────────────────────
console.log("\n=== chain_health ===");
try {
  const h = await call("chain_health");
  console.log(JSON.stringify(h, null, 2));
} catch (e) { console.log("ERROR:", e.message); }

// ── 2. get_pools ───────────────────────────────────────────────────────────
console.log("\n=== get_pools (first 10) ===");
try {
  const p = await call("get_pools");
  // p may be an array or { pools: [] }
  const pools = Array.isArray(p) ? p : (p.pools ?? []);
  console.log(`Total pools returned: ${pools.length}`);
  pools.slice(0, 10).forEach((pool, i) => {
    const tvl = pool.tvl ?? pool.tvlUsd ?? pool.liquidity ?? "?";
    const tokenA = pool.tokenASymbol ?? pool.mintA?.slice(0,8) ?? "?";
    const tokenB = pool.tokenBSymbol ?? pool.mintB?.slice(0,8) ?? "?";
    console.log(`  ${i+1}. ${tokenA}/${tokenB}  tvl=${tvl}  dex=${pool.dex ?? pool.programName ?? "?"}`);
  });
  if (pools.length === 0) console.log("  (empty — no pools returned)");
} catch (e) { console.log("ERROR:", e.message); }

// ── 3. get_quote for key pairs ─────────────────────────────────────────────
const COOK  = "So11111111111111111111111111111111111111112";
const USDC  = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const bCOOK = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";

const pairs = [
  { name: "COOK→USDC",  inputMint: COOK,  outputMint: USDC,  amount: 10 },
  { name: "USDC→COOK",  inputMint: USDC,  outputMint: COOK,  amount: 10 },
  { name: "COOK→bCOOK", inputMint: COOK,  outputMint: bCOOK, amount: 10 },
  { name: "bCOOK→COOK", inputMint: bCOOK, outputMint: COOK,  amount: 10 },
  { name: "COOK→COOK",  inputMint: COOK,  outputMint: COOK,  amount: 10 }, // should error
];

console.log("\n=== get_quote per pair ===");
for (const pair of pairs) {
  try {
    const q = await call("get_quote", {
      inputMint: pair.inputMint,
      outputMint: pair.outputMint,
      amount: pair.amount,
    });
    if (q.error) {
      console.log(`✗  ${pair.name}: ${q.error}${q.hint ? " — " + q.hint : ""}`);
    } else {
      console.log(`✓  ${pair.name}: expectedOut=${q.output?.expectedOut ?? "?"}  priceImpact=${q.priceImpactPct ?? "?"}  venues=${JSON.stringify(q.route?.hops?.map(h=>h.venue))}`);
    }
  } catch (e) {
    console.log(`✗  ${pair.name}: ${e.message}`);
  }
}

await client.close();
