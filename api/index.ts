/**
 * Vercel serverless entry point.
 *
 * Vercel picks up any file in api/ and runs it as a serverless function.
 * This file imports the Express app from the server package and exports it
 * as the default handler — Vercel's Node.js runtime accepts an Express app
 * directly as a request handler (it implements the same (req, res) signature).
 *
 * Environment variables required (set in Vercel project settings):
 *   COOKIE_RPC_URL      — Cookie Chain RPC endpoint
 *   COOKIE_SWAP_API_URL — Candy Shop aggregator base URL (optional, has default)
 *   CORS_ORIGIN         — Allowed origin (optional, defaults to * on Vercel)
 */
import app from "../server/src/index.js";

export default app;
