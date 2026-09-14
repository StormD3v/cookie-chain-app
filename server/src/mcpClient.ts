/**
 * cookie-mcp client singleton.
 *
 * Spawns `npx cookie-mcp` as a child process and keeps a single MCP
 * Client connected over stdio.  Read-only tools need no key; COOKIE_RPC_URL
 * is forwarded from the parent environment (or .env.local).
 *
 * Connection is warmed at module import time so the child process is fully
 * ready before the first HTTP request arrives.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

// Resolve the locally-installed cookie-mcp binary so we never hit npx's
// interactive "ok to install?" prompt in non-TTY (concurrently) environments.
// On Windows, spawn the .cmd shim; on POSIX use the bare binary.
// Path: server/src/ → server/ → project root → node_modules/.bin/
const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN_EXT = process.platform === "win32" ? ".cmd" : "";
const COOKIE_MCP_BIN = resolve(__dirname, `../../node_modules/.bin/cookie-mcp${BIN_EXT}`);

// How long to wait after the MCP handshake before issuing the first tool call.
// cookie-mcp connects to the RPC and loads config after the handshake; without
// this pause the first callTool races against that startup work.
const POST_CONNECT_SETTLE_MS = 3000;

// Retry config for callTool — retries once on timeout to handle edge cases
// where the process was still warming when the first request arrived.
const CALL_RETRY_COUNT = 1;
const CALL_RETRY_DELAY_MS = 2000;

let _client: Client | null = null;
let _connecting: Promise<Client> | null = null;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createClient(): Promise<Client> {
  const rpcUrl = process.env["COOKIE_RPC_URL"] ?? "https://rpc.cookiescan.io";

  // StdioClientTransport requires Record<string, string> — strip undefineds
  const parentEnv = Object.fromEntries(
    Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)
  );

  const transport = new StdioClientTransport({
    command: COOKIE_MCP_BIN,
    args: [],
    env: {
      ...parentEnv,
      COOKIE_RPC_URL: rpcUrl,
      // COOKIE_PRIVATE_KEY intentionally omitted — read-only mode
    },
  });

  const client = new Client(
    { name: "cookie-chain-proxy", version: "0.1.0" },
    { capabilities: {} }
  );

  console.log("[mcp] connecting to cookie-mcp…");
  await client.connect(transport);

  // Give cookie-mcp time to finish its own startup after the MCP handshake.
  // Without this the first tool call races against the child's RPC init.
  console.log(`[mcp] handshake complete — settling for ${POST_CONNECT_SETTLE_MS}ms`);
  await sleep(POST_CONNECT_SETTLE_MS);
  console.log("[mcp] ready");

  return client;
}

/**
 * Returns the shared MCP client, connecting on first call.
 * Safe to call concurrently — only one connection is ever opened.
 */
export async function getMcpClient(): Promise<Client> {
  if (_client) return _client;
  if (_connecting) return _connecting;

  _connecting = createClient().then((c) => {
    _client = c;
    _connecting = null;

    // If the transport closes, reset so the next call reconnects
    c.onclose = () => {
      console.log("[mcp] connection closed — will reconnect on next request");
      _client = null;
    };

    return c;
  });

  return _connecting;
}

/**
 * Call a cookie-mcp tool and return its parsed JSON result.
 * Retries once on timeout to handle edge-case startup races.
 * Throws a descriptive Error on failure.
 */
export async function callTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= CALL_RETRY_COUNT; attempt++) {
    if (attempt > 0) {
      console.log(`[mcp] retrying ${toolName} (attempt ${attempt + 1})…`);
      await sleep(CALL_RETRY_DELAY_MS);
    }

    try {
      const client = await getMcpClient();
      const result = await client.callTool({ name: toolName, arguments: args });

      // SDK result.content is ContentBlock[] — find the first text block
      const content = result.content as Array<{ type: string; text?: string }> | undefined;
      const first = content?.find((b) => b.type === "text");

      if (!first || !first.text) {
        throw new Error(`Unexpected response from ${toolName}: no text content block`);
      }

      return JSON.parse(first.text) as T;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[mcp] ${toolName} attempt ${attempt + 1} failed:`, lastError.message);
      // On timeout, reset the client so the next attempt reconnects fresh
      if (lastError.message.includes("timed out") || lastError.message.includes("-32001")) {
        _client = null;
      }
    }
  }

  throw lastError ?? new Error(`callTool(${toolName}) failed`);
}

// ── Warm the connection at import time ────────────────────────────────────
// This fires as soon as the server module loads, so cookie-mcp is ready
// well before the first HTTP request arrives.
getMcpClient().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("[mcp] warm-up failed:", msg);
});
