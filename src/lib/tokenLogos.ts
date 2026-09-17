/**
 * Static mint-address → logo-path map.
 *
 * Paths are relative to /public — Vite serves public/ at the root,
 * so "/logos/cook.svg" resolves to public/logos/cook.svg at build time.
 *
 * Mint addresses MUST match KNOWN_TOKENS in SwapPanel.tsx exactly.
 * A mismatch silently falls back to emoji — no error is thrown.
 *
 * Icon sourcing:
 *   COOK  (So11…112)  — Native gas token. No canonical icon published in the
 *                        Cookie Chain token registry (logoUri: null). Using the
 *                        project-designed SVG as the appropriate fallback.
 *   bCOOK (EkPa…uhz) — Liquid staking token. Canonical icon fetched from the
 *                        Cookie Chain token registry (cookiescan.io/api/tokens)
 *                        which returns logoUri: "https://bakeyourstake.xyz/bcook.png".
 *                        Cached locally as /logos/bcook.png for offline reliability.
 *   CHAT  (2wPK…Q)   — Not found in the Cookie Chain token registry (200 tokens
 *                        searched, no matching mint). Using project-designed SVG.
 */
export const TOKEN_LOGOS: Record<string, string> = {
  // COOK — native gas token; registry has no logo, using designed SVG
  "So11111111111111111111111111111111111111112": "/logos/cook.svg",
  // bCOOK — canonical icon from cookiescan.io/api/tokens → bakeyourstake.xyz/bcook.png
  "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": "/logos/bcook.png",
  // CHAT — not in Cookie Chain registry; using project-designed SVG
  "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": "/logos/chat.svg",
};

/** Returns the logo path for a mint, or undefined if not in the map. */
export function getTokenLogo(mint: string): string | undefined {
  return TOKEN_LOGOS[mint];
}
