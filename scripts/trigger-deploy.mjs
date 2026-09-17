import { readFileSync } from "fs";
import { resolve } from "path";

const authPath = `${process.env.APPDATA}\\com.vercel.cli\\Data\\auth.json`;
const { token } = JSON.parse(readFileSync(authPath, "utf8"));

const body = JSON.stringify({
  name: "cookie-chain-app",
  gitSource: {
    type: "github",
    repoId: "1369669515",
    ref: "master",
  },
  target: "production",
});

const res = await fetch(
  "https://api.vercel.com/v13/deployments?teamId=stormd3v-projects&forceNew=1",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  }
);

const data = await res.json();

if (!res.ok) {
  console.error("Error:", JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("Deployment triggered!");
console.log("  ID:     ", data.id);
console.log("  URL:    ", `https://${data.url}`);
console.log("  Status: ", data.readyState);
console.log("  Alias:  ", data.alias?.[0] ?? "(none yet)");
