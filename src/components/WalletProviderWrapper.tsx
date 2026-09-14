import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { NightlyWalletAdapter } from "@solana/wallet-adapter-nightly";

// Import default wallet-adapter UI styles
import "@solana/wallet-adapter-react-ui/styles.css";

// Cookie Chain mainnet RPC — pulled from env, falls back to the public endpoint.
// Set VITE_COOKIE_RPC_URL in .env.local to override.
const COOKIE_RPC_URL =
  import.meta.env.VITE_COOKIE_RPC_URL ?? "https://rpc.cookiescan.io";

interface Props {
  children: ReactNode;
}

export function WalletProviderWrapper({ children }: Props) {
  // Only Nightly for now; extend this array to add more wallets later.
  const wallets = useMemo(() => [new NightlyWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={COOKIE_RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
