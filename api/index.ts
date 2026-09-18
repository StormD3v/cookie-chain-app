/**
 * Vercel serverless entry point — Express API with error surface.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

// Lazy-load the Express app so startup errors are catchable
let _app: ((req: IncomingMessage, res: ServerResponse) => void) | null = null;
let _loadError: string | null = null;

async function loadApp() {
    if (_app) return _app;
    if (_loadError) return null;
    try {
        const express = (await import("express")).default;
        const cors = (await import("cors")).default;
        const { getBalances } = await import("./routes/balances.js");
        const { getActivity } = await import("./routes/activity.js");
        const { postSwapQuote, postSwapBuild, postSwapSubmit, getSwapConfirm } =
            await import("./routes/swap.js");

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

        _app = app;
        return _app;
    } catch (err: unknown) {
        _loadError = err instanceof Error ? err.stack ?? err.message : String(err);
        return null;
    }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    const app = await loadApp();
    if (!app) {
        (res as any).statusCode = 500;
        (res as any).setHeader("Content-Type", "application/json");
        (res as any).end(JSON.stringify({ error: "App failed to load", detail: _loadError }));
        return;
    }
    app(req, res);
}
