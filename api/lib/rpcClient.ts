/**
 * Shared RPC Connection singleton for all server-side routes.
 *
 * A single Connection object is reused across requests. In serverless
 * environments this lives for the lifetime of the warm instance; on cold
 * start it is recreated. The lazy pattern here handles both correctly.
 *
 * Commitment level "confirmed" matches the previous activity.ts behaviour.
 */
import { Connection } from "@solana/web3.js";

const RPC_URL = process.env["COOKIE_RPC_URL"] ?? "https://rpc.cookiescan.io";

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(RPC_URL, "confirmed");
  }
  return _connection;
}
