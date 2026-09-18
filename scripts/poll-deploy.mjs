import { readFileSync } from "fs";

const authPath = `${process.env.APPDATA}\\com.vercel.cli\\Data\\auth.json`;
const { token } = JSON.parse(readFileSync(authPath, "utf8"));

const DEPLOY_ID = process.argv[2] ?? "dpl_GRDgwQaB47cK9ieVTbC9GrYpVppi";
const PROD_URL = "https://cookie-chain-app-stormd3v-projects.vercel.app";

console.log(`Polling ${DEPLOY_ID}...`);
let lastState = "";
for (let i = 0; i < 40; i++) {
  await new Promise(r => setTimeout(r, 8000));
  const res = await fetch(
    `https://api.vercel.com/v13/deployments/${DEPLOY_ID}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const d = await res.json();
  const state = d.readyState ?? d.status ?? "unknown";
  if (state !== lastState) {
    console.log(`[${new Date().toISOString().slice(11, 19)}] ${state}`);
    lastState = state;
  }
  if (state === "READY") {
    console.log(`\nDeployment READY`);
    console.log(`  Production: ${PROD_URL}`);
    break;
  }
  if (state === "ERROR" || state === "CANCELED") {
    console.log(`\nDeployment ${state}`);
    if (d.errorCode) console.log("  Error:", d.errorCode, d.errorMessage ?? "");
    break;
  }
}
