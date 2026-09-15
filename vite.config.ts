import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Inject Buffer polyfill for @solana/spl-token.
    // The 'buffer' package is already installed as a transitive dep.
    // This virtual module is prepended to every entry so Buffer is
    // available before any Solana code runs.
    {
      name: "buffer-polyfill",
      transformIndexHtml(html) {
        return html; // no-op; polyfill is injected via config.resolve + optimizeDeps
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  define: {
    "process.env": {},
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Redirect bare 'buffer' imports to the browser-compatible package
      buffer: "buffer/",
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle buffer so it's available synchronously
    include: ["buffer"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
});
