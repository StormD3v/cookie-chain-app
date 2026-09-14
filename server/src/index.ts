/**
 * Cookie Chain proxy server
 *
 * Spawns cookie-mcp as a stdio child process via the MCP SDK and exposes a
 * small REST API that the Vite/React frontend consumes.  No wallet key is
 * set — all calls are read-only.
 *
 * Endpoints
 *   GET  /api/health                 — liveness probe
 *   GET  /api/balances?wallet=       — token balances via cookie-mcp get_balance
 *   GET  /api/activity?wallet=       — recent tx history via Cookie Chain RPC
 *   POST /api/swap/quote             — swap quote (read-only, no key)
 *   POST /api/swap/build             — build unsigned tx (no key)
 *   POST /api/swap/submit            — submit signed tx from frontend
 *   GET  /api/swap/confirm/:sig      — poll confirmation status
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

const PORT = Number(process.env["PORT"] ?? 3001);

// ── App ───────────────────────────────────────────────────────

const app = express();

app.use(
  cors({
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "cookie-chain-proxy", ts: new Date().toISOString() });
});

app.get("/api/balances", getBalances);
app.get("/api/activity", getActivity);

app.post("/api/swap/quote", postSwapQuote);
app.post("/api/swap/build", postSwapBuild);
app.post("/api/swap/submit", postSwapSubmit);
app.get("/api/swap/confirm/:signature", getSwapConfirm);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ── Start ─────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`);
  console.log(`[proxy] COOKIE_RPC_URL = ${process.env["COOKIE_RPC_URL"] ?? "https://rpc.cookiescan.io (default)"}`);
});
