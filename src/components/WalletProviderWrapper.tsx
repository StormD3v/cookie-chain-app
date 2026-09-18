import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from "@solana-mobile/wallet-adapter-mobile";

import "@solana/wallet-adapter-react-ui/styles.css";

// Cookie Chain mainnet RPC — falls back to the public endpoint.
const COOKIE_RPC_URL =
  import.meta.env.VITE_COOKIE_RPC_URL ?? "https://rpc.cookiescan.io";

// Production URL of the deployed app — used as the MWA app identity so
// Android wallets show the correct name and icon in their approval screen.
const APP_URI = "https://cookie-chain-app-stormd3v-projects.vercel.app";

interface Props {
  children: ReactNode;
}

export function WalletProviderWrapper({ children }: Props) {
  const wallets = useMemo(
    () => [
      // Android mobile browsers: SolanaMobileWalletAdapter hands off to any
      // MWA-compatible wallet app (including Nightly) via a local WebSocket
      // intent on Android Chrome. WalletProvider already auto-injects MWA
      // when it detects a mobile environment, but providing an explicit instance
      // here sets the correct appIdentity so wallets display "Cookie Chain"
      // rather than "Unknown app" in their approval screen.
      // On non-Android environments this adapter is silently unavailable.
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

      // Desktop (and iOS in-app browser / Safari extension): Nightly extension.
      // Detected via window.nightly.solana injection. If not present the adapter
      // stays in NotDetected state and WalletMultiButton shows it as installable.
      new NightlyWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={COOKIE_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
