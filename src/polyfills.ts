/**
 * Browser polyfills — must be the very first import in main.tsx.
 *
 * @solana/spl-token (and other Solana packages) reference the Node.js
 * `Buffer` global. In browser builds this doesn't exist. The `buffer`
 * package is already installed as a transitive dependency — we just need
 * to attach it to globalThis before any Solana code is evaluated.
 *
 * ESM imports are hoisted, so placing this in a dedicated module and
 * importing it first (before react, App, etc.) ensures it executes
 * before any Solana package initialises.
 */
import { Buffer } from "buffer";

// Attach to every global object variant browsers expose
if (typeof globalThis !== "undefined" && !("Buffer" in globalThis)) {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}
if (typeof window !== "undefined" && !("Buffer" in window)) {
  (window as Window & { Buffer: typeof Buffer }).Buffer = Buffer;
}
