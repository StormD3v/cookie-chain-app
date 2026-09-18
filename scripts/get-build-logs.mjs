import { readFileSync } from "fs";

const authPath = `${process.env.APPDATA}\\com.vercel.cli\\Data\\auth.json`;
const { token } = JSON.parse(readFileSync(authPath, "utf8"));

const DEPLOY_ID = process.argv[2] ?? "dpl_2SV9iNjhRoTbFRSiVa1SqyuBRRF3";

const res = await fetch(
  `https://api.vercel.com/v2/deployments/${DEPLOY_ID}/events?teamId=stormd3v-projects&limit=100&direction=backward`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const events = await res.json();

if (!Array.isArray(events)) {
  console.log(JSON.stringify(events, null, 2));
  process.exit(1);
}

// Filter for meaningful events
for (const ev of events) {
  const text = ev.text ?? ev.payload?.text ?? ev.payload?.info ?? "";
  if (text && !text.includes("npm warn") && !text.includes("npm notice")) {
    console.log(text);
  }
}
