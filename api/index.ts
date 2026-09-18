/**
 * Vercel serverless entry point.
 * Imports from the compiled server output in server/dist/.
 */
// @ts-ignore
import app from "../server/dist/index.js";

export default app;
