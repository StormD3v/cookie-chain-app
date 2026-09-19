/**
 * Cookie Chain proxy server
 *
 * Exposes a REST API that the frontend consumes.
 * The Express app is exported for Vercel serverless use.
 * app.listen() is called only when this file is run directly (local dev).
 *
 * Endpoints:
 *   GET  /api/health
 *   GET  /api/balances?wallet=
 *   GET  /api/activity?wallet=
 *   POST /api/swap/quote
 *   POST /api/swap/build
 *   POST /api/swap/submit
 *   GET  /api/swap/confirm/:sig
 */

import express from "express";
import cors from "cors";
import { getBalances } from "./routes/balances.js";
import { getActivity } from "./routes/activity.js";
import {
  postSwapQuote,
  postSwapBuild,
  postSwapSubmit,
  getSwapConfirm,
} from "./routes/swap.js";

const app = express();

app.use(
  cors({
    // Frontend and API are same-origin on Vercel, so this header is rarely
    // checked by browsers in production. Scoped to the deployed URL as a
    // defence-in-depth measure — prevents third-party sites from calling the
    // API directly. Falls back to env var for local dev flexibility.
    origin: process.env["CORS_ORIGIN"] ?? "https://cookie-chain-app-stormd3v-projects.vercel.app",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cookie-chain-proxy", ts: new Date().toISOString() });
});

app.get("/api/balances", getBalances);
app.get("/api/activity", getActivity);

app.post("/api/swap/quote", postSwapQuote);
app.post("/api/swap/build", postSwapBuild);
app.post("/api/swap/submit", postSwapSubmit);
app.get("/api/swap/confirm/:signature", getSwapConfirm);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Export for Vercel serverless (api/index.ts imports this)
export default app;

// Run directly for local dev (npm run dev starts this via tsx).
// import.meta.url comparison ensures listen() is NOT called when Vercel
// imports this file as a module — only when tsx runs it as the entry point.
import { pathToFileURL } from "node:url";
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const PORT = Number(process.env["PORT"] ?? 3001);
  app.listen(PORT, () => {
    console.log(`[proxy] listening on http://localhost:${PORT}`);
    console.log(`[proxy] COOKIE_RPC_URL = ${process.env["COOKIE_RPC_URL"] ?? "https://rpc.cookiescan.io (default)"}`);
  });
}
