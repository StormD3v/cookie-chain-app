import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";

import "@solana/wallet-adapter-react-ui/styles.css";

// Cookie Chain mainnet RPC
const COOKIE_RPC_URL =
  import.meta.env.VITE_COOKIE_RPC_URL ?? "https://rpc.cookiescan.io";

interface Props {
  children: ReactNode;
}

export function WalletProviderWrapper({ children }: Props) {
  // Empty wallets array — all wallet detection is handled automatically by
  // @solana/wallet-adapter-react's useStandardWalletAdapters hook, which
  // discovers every Wallet Standard-compliant wallet installed in the browser
  // (Nightly, Trust Wallet, Phantom, etc.) and wraps them with StandardWalletAdapter.
  //
  // StandardWalletAdapter calls features['standard:connect'].connect() which
  // is Nightly's recommended connection API (per https://docs.nightly.app/docs/solana/solana/connect).
  //
  // NightlyWalletAdapter (legacy) was removed because:
  //   1. It used the old window.nightly.solana.connect() API which is unreliable
  //      in current Nightly extension versions.
  //   2. useStandardWalletAdapters already filters it out when Nightly registers
  //      as a Standard wallet (producing a console warning about redundancy).
  //   3. Having it in the array created ambiguity about which adapter was selected.
  //
  // Mobile: NightlyMobileButton uses the nightly:// deeplink to open the Nightly
  // app's in-app browser, where window.nightly registers as a Standard wallet
  // and is picked up automatically.
  const wallets = useMemo(() => [], []);

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
