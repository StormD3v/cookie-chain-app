/**
 * Vercel serverless entry point — full Express API.
 *
 * Self-contained: all routes defined here, server/src imported directly.
 * Vercel compiles this file and all its local imports at build time.
 */
import express from "express";
import cors from "cors";
import { getBalances } from "../server/src/routes/balances.js";
import { getActivity } from "../server/src/routes/activity.js";
import {
    postSwapQuote,
    postSwapBuild,
    postSwapSubmit,
    getSwapConfirm,
} from "../server/src/routes/swap.js";

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
