import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";

import "@solana/wallet-adapter-react-ui/styles.css";

// Cookie Chain mainnet RPC
const COOKIE_RPC_URL =
  import.meta.env.VITE_COOKIE_RPC_URL ?? "https://rpc.cookiescan.io";

interface Props {
  children: ReactNode;
}

export function WalletProviderWrapper({ children }: Props) {
  const wallets = useMemo(
    () => [
      // Desktop / iOS Safari extension: Nightly detects via window.nightly.solana.
      //
      // Mobile (Android): Nightly does NOT implement the generic MWA protocol
      // (SolanaMobileWalletAdapter was removed — it opened Phantom instead of
      // Nightly because Phantom is MWA-registered and Nightly is not).
      // Mobile users connect via the "Open in Nightly" deeplink button in the UI,
      // which opens the site inside Nightly's in-app browser where the extension
      // is injected automatically.
      new NightlyWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={COOKIE_RPC_URL}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        // Custom localStorage key. This makes it easy to reason about which
        // key to inspect/clear in browser DevTools if needed.
        localStorageKey="cookie-chain-wallet"
        onError={(error) => {
          // Log connection errors. WalletProvider's own handleConnectError
          // already calls changeWallet(null) before this fires, so
          // localStorage is already cleared at this point.
          console.warn("[wallet]", error.name, error.message);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
