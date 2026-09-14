/**
 * Static mint-address → logo-path map.
 *
 * Paths are relative to /public — Vite serves public/ at the root,
 * so "/logos/cook.svg" resolves to public/logos/cook.svg at build time.
 *
 * Mint addresses MUST match KNOWN_TOKENS in SwapPanel.tsx exactly.
 * A mismatch silently falls back to emoji — no error is thrown.
 */
export const TOKEN_LOGOS: Record<string, string> = {
  // COOK — native asset on Cookie Chain (same address as wSOL on Solana)
  "So11111111111111111111111111111111111111112": "/logos/cook.svg",
  // bCOOK — liquid-staked COOK
  "EkPafx58mgwkEnGwo62jXhXDAdJ37Z8G8MFBRPsr9uhz": "/logos/bcook.svg",
  // CHAT — Cookie Chat token
  "2wPK38gv8dWU89K5zDAAULAihnU1sRocbpzwPP6twY7Q": "/logos/chat.svg",
};

/** Returns the logo path for a mint, or undefined if not in the map. */
export function getTokenLogo(mint: string): string | undefined {
  return TOKEN_LOGOS[mint];
}
