import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";

import "@solana/wallet-adapter-react-ui/styles.css";

// Cookie Chain mainnet RPC
const COOKIE_RPC_URL =
  import.meta.env.VITE_COOKIE_RPC_URL ?? "https://rpc.cookiescan.io";

// Production URL — used as the MWA app identity so Android wallets show
// "Cookie Chain" instead of "This app's identity could not be verified."
const APP_URI = "https://cookie-chain-app-stormd3v-projects.vercel.app";

interface Props {
  children: ReactNode;
}

export function WalletProviderWrapper({ children }: Props) {
  const wallets = useMemo(
    () => [
      // SolanaMobileWalletAdapter — Android MWA (Phantom, Solflare, etc.)
      //
      // WalletProvider auto-injects an MWA adapter on Android Chrome, but the
      // default one only sets `uri` from window.location and leaves `name` and
      // `icon` empty — causing wallets to show "identity could not be verified."
      //
      // Providing our own instance overrides the default (WalletProvider checks
      // for an existing adapter named SolanaMobileWalletAdapterWalletName before
      // creating one). This supplies the real app name, URL, and icon.
      //
      // Note: Nightly does NOT implement MWA on Android. Its mobile path is the
      // Nightly in-app browser (nightly:// deeplink), not this adapter.
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: "Cookie Chain",
          uri: APP_URI,
          icon: "/favicon.png",
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: "mainnet-beta",
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),

      // No legacy wallet adapters (NightlyWalletAdapter removed in Round 17).
      // All Wallet Standard wallets (Nightly, Trust Wallet, Phantom on desktop,
      // etc.) are detected automatically by useStandardWalletAdapters inside
      // WalletProvider — no explicit registration needed.
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={COOKIE_RPC_URL}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        localStorageKey="cookie-chain-wallet"
        onError={(error) => {
          console.warn("[wallet] error:", error.name, error.message);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
