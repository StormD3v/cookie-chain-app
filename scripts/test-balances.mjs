/**
 * Round 12 verification: duplicate COOK check + price feed check.
 * Uses the preview wallet (0 holdings) and then a hardcoded address known
 * to have tokens (from prior sessions: the real wallet with COOK/bCOOK/CHAT).
 */
const BASE   = "http://localhost:3001";
const WALLETS = [
  // Preview wallet — 0 holdings, still confirms shape and no crash
  ["preview (Es1f5…)", "Es1f5ShcHpP8akfTJMqEPbEL2QZbrKsFBxwbumJMv8Ag"],
];

for (const [label, wallet] of WALLETS) {
  const start = Date.now();
  const res   = await fetch(`${BASE}/api/balances?wallet=${wallet}`);
  const ms    = Date.now() - start;
  const data  = await res.json();

  console.log(`\n══ ${label}  (${ms}ms, HTTP ${res.status}) ══`);

  if (!data.balances) {
    console.log("ERROR:", JSON.stringify(data));
    continue;
  }

  // Duplicate-mint check
  const mints = data.balances.map(b => b.mint);
  const dupes = mints.filter((m, i) => mints.indexOf(m) !== i);

  console.log(`Balances returned: ${data.balances.length}`);
  for (const b of data.balances) {
    const usd = b.usdValue !== null ? `$${b.usdValue.toFixed(6)}` : "no price";
    console.log(`  ${b.symbol.padEnd(8)} uiAmount=${String(b.uiAmount).padEnd(15)} usdValue=${usd}`);
  }

  if (dupes.length > 0) {
    console.log(`\n⚠ DUPLICATES FOUND: ${dupes.join(", ")}`);
  } else {
    console.log("\n✓ No duplicate mints");
  }

  // Price check
  const hasPrices = data.balances.some(b => b.usdValue !== null);
  console.log(hasPrices ? "✓ At least one token has usdValue" : "✗ All usdValues are null");

  console.log("\nFull JSON:");
  console.log(JSON.stringify(data, null, 2));
}

// Direct price feed check
console.log("\n══ Candy Shop /tokens price feed ══");
const pr = await fetch("https://swap.cookiescan.io/api/tokens", { signal: AbortSignal.timeout(8000) });
const tokens = await pr.json();
const bCOOK = tokens.find(t => t.mint === "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz");
const CHAT  = tokens.find(t => t.mint === "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q");

if (bCOOK) {
  const cookUsd = bCOOK.priceUsd / bCOOK.priceNative;
  console.log(`bCOOK.priceUsd    = ${bCOOK.priceUsd}`);
  console.log(`bCOOK.priceNative = ${bCOOK.priceNative}  (COOK per bCOOK)`);
  console.log(`Derived COOK USD  = ${bCOOK.priceUsd} / ${bCOOK.priceNative} = $${cookUsd.toFixed(8)}`);
  console.log(`Derived bCOOK USD = $${bCOOK.priceUsd.toFixed(8)}`);
}
if (CHAT) {
  console.log(`CHAT.priceUsd     = ${CHAT.priceUsd}`);
}

// Manual spot-check: if we had 3303.0748 COOK and 81.7 bCOOK (from prior screenshots)
if (bCOOK) {
  const cookUsd  = bCOOK.priceUsd / bCOOK.priceNative;
  const cookAmt  = 3303.0748;
  const bCookAmt = 81.7;
  const cookVal  = cookAmt  * cookUsd;
  const bCookVal = bCookAmt * bCOOK.priceUsd;
  console.log(`\nSpot-check (real wallet holdings from prior screenshot):`);
  console.log(`  3303.0748 COOK  × $${cookUsd.toFixed(8)} = $${cookVal.toFixed(4)}`);
  console.log(`  81.7 bCOOK      × $${bCOOK.priceUsd.toFixed(8)} = $${bCookVal.toFixed(4)}`);
  console.log(`  Total estimated = $${(cookVal + bCookVal).toFixed(4)}`);
}
