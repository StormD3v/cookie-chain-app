/**
 * Vercel serverless entry point.
 *
 * Imports the Express app from the server package and exports it as the
 * default handler. Vercel's Node.js runtime invokes the default export
 * with (req, res) for each incoming request.
 *
 * Environment variables (set in Vercel project settings):
 *   COOKIE_RPC_URL      — Cookie Chain RPC endpoint (default: https://rpc.cookiescan.io)
 *   COOKIE_SWAP_API_URL — Candy Shop aggregator base URL (optional)
 */
import app from "../server/src/index.js";

export default app;
