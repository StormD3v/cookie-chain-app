/**
 * Vercel serverless entry point — minimal diagnostic version.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, path: (req as any).url, ts: new Date().toISOString() }));
}
