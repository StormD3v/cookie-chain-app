import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to the cookie-mcp proxy server
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  // Solana wallet-adapter uses Buffer from the Node stdlib.
  // Vite's built-in esbuild handles globalThis; we just need to define
  // process.env so wallet-adapter internals don't blow up at runtime.
  define: {
    "process.env": {},
    global: "globalThis",
  },
});
