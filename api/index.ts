/**
 * Vercel serverless entry point — Cookie Chain API.
 *
 * All route source files are co-located in api/ so Vercel's bundler can
 * compile and include them in a single pass without cross-workspace imports.
 *
 * Environment variables (set in Vercel project settings):
 *   COOKIE_RPC_URL      — Cookie Chain RPC (default: https://rpc.cookiescan.io)
 *   COOKIE_SWAP_API_URL — Candy Shop aggregator base URL (optional)
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
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
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

app.use((_req, res) => { res.status(404).json({ error: "Not found" }); });

export default app;
