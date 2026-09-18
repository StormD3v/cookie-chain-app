/**
 * NightlyMobileButton — visible only on mobile browsers (non-desktop UA).
 *
 * Nightly's mobile app does NOT implement the Solana Mobile Wallet Adapter
 * (MWA) protocol. It cannot be reached via the generic solana-wallet://
 * Android intent. Instead, Nightly exposes a deeplink scheme that opens
 * the app and loads a URL inside its in-app browser, where
 * window.nightly.solana is automatically injected — identical to the
 * desktop extension behaviour.
 *
 * Deeplink format (from https://docs.nightly.app/docs/deeplinks):
 *   nightly://v1?network=solana&cluster=mainnet&url=<encoded-url>
 *
 * Universal link fallback (for when the app is not installed):
 *   https://nightly.app/v1?network=solana&cluster=mainnet&url=<encoded-url>
 *   → redirects to the app store on Android/iOS
 *
 * Using <a href="nightly://..."> with an <a href="https://nightly.app/...">
 * fallback is the standard pattern recommended by Nightly's docs.
 *
 * Source: https://docs.nightly.app/docs/deeplinks
 */

// The production app URL that will load inside Nightly's in-app browser.
const APP_URL = "https://cookie-chain-app-stormd3v-projects.vercel.app";

import { isMobileBrowser } from "../lib/isMobile";

export function NightlyMobileButton() {
  // Don't render on desktop — desktop users use the extension.
  if (!isMobileBrowser()) return null;

  const encodedUrl = encodeURIComponent(APP_URL);
  const params = `network=solana&cluster=mainnet&url=${encodedUrl}`;

  // Primary: custom scheme (opens app directly if installed)
  const deeplinkHref = `nightly://v1?${params}`;
  // Fallback: universal link (app store if not installed, or Safari prompt)
  const universalHref = `https://nightly.app/v1?${params}`;

  // On Android: clicking nightly:// triggers the OS intent. If the app is
  // not installed the browser shows an error page, so we use the universal
  // link as a visible fallback anchor underneath.
  // On iOS: nightly:// works if the app is installed. Universal link fallback
  // handles the "not installed" case.

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
      <a
        href={deeplinkHref}
        className="wallet-adapter-button wallet-adapter-button-trigger"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}
        aria-label="Open in Nightly app"
      >
        {/* Nightly logo inline SVG (purple circle with owl, same as adapter icon) */}
        <svg width="20" height="20" viewBox="0 0 96 96" fill="none" aria-hidden="true">
          <circle cx="48" cy="48" r="48" fill="#6D73F8" />
          <path d="M48 85.6C48 85.6 52.5 85.6 55.4 82.6C58.9 79.3 57.4 75.4 62.3 71.4C67 67.6 72.9 70.3 72.9 70.3C77 62.1 74.8 52.6 74.8 52.6C81.8 34.3 76 21.2 74.4 17.4C69.4 24.3 63.2 29.2 55.8 32.4C53.2 31.7 50.6 31.3 48 31.4C45.4 31.3 42.8 31.7 40.2 32.4C32.8 29.2 26.6 24.3 21.6 17.4C20 21.2 14.2 34.3 21.2 52.6C21.2 52.6 19 62.1 23.1 70.3C23.1 70.3 29 67.6 33.7 71.4C38.7 75.4 37.1 79.3 40.6 82.6C43.5 85.6 48 85.6 48 85.6Z" fill="white" />
        </svg>
        Open in Nightly
      </a>
      <a
        href={universalHref}
        style={{ fontSize: "0.6875rem", color: "var(--crumb)", textDecoration: "underline", opacity: 0.7 }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Don't have Nightly? Get it here
      </a>
    </div>
  );
}
