/// <reference types="vite/client" />

// ── CSS Modules ────────────────────────────────────────────────────────────
// Tell TypeScript that *.module.css imports are valid and return an object
// of string class names. Vite handles the actual transform at build time.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
