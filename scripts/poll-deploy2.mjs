import { readFileSync } from "fs";
const authPath = `${process.env.APPDATA}\\com.vercel.cli\\Data\\auth.json`;
const { token } = JSON.parse(readFileSync(authPath, "utf8"));
const ID = process.argv[2];
console.log("Polling", ID);
for (let i = 0; i < 60; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const r = await fetch(`https://api.vercel.com/v13/deployments/${ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await r.json();
  const state = d.readyState ?? d.status ?? "?";
  process.stdout.write(`\r[${new Date().toISOString().slice(11,19)}] ${state}     `);
  if (state === "READY") { console.log("\nREADY"); break; }
  if (state === "ERROR" || state === "CANCELED") { console.log("\n" + state, d.errorCode ?? ""); break; }
}
