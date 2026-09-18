/**
 * WalletButton — replaces WalletMultiButton everywhere.
 *
 * Key behavioral difference from WalletMultiButton:
 *   - When NOT connected: always opens the wallet picker modal on click,
 *     regardless of any wallet name stored in localStorage. This prevents
 *     the stuck state where a previously selected (but never connected)
 *     wallet causes the button to skip the picker and try to auto-connect.
 *   - When connected: shows a truncated address. Clicking opens a small
 *     dropdown with "Change wallet" and "Disconnect".
 *
 * The stuck state root cause: SolanaMobileWalletAdapter (now removed) left
 * 'Mobile Wallet Adapter' in localStorage when Android closed the intent
 * without firing a disconnect event. WalletMultiButton in 'has-wallet' state
 * went straight to connect — no picker, no escape. This button eliminates
 * that path entirely.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletButton({ className }: { className?: string }) {
  const { connected, connecting, disconnecting, publicKey, disconnect, select } =
    useWallet();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click / touch
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  const openPicker = useCallback(() => {
    // Always show the full wallet picker — never auto-connect.
    setVisible(true);
  }, [setVisible]);

  const handleDisconnect = useCallback(() => {
    setMenuOpen(false);
    disconnect().catch(() => {});
    // Also deselect so localStorage is cleared and next tap shows the picker
    select(null);
  }, [disconnect, select]);

  const handleChangeWallet = useCallback(() => {
    setMenuOpen(false);
    setVisible(true);
  }, [setVisible]);

  // ── Label ──────────────────────────────────────────────────────────────────
  let label: string;
  if (connecting)    label = "Connecting…";
  else if (disconnecting) label = "Disconnecting…";
  else if (connected && publicKey) {
    const b = publicKey.toBase58();
    label = b.slice(0, 4) + "…" + b.slice(-4);
  } else {
    label = "Select Wallet";
  }

  const baseClass = `wallet-adapter-button wallet-adapter-button-trigger${className ? " " + className : ""}`;

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <button
        className={baseClass}
        onClick={openPicker}
        disabled={connecting || disconnecting}
      >
        {label}
      </button>
    );
  }

  // ── Connected: address + dropdown ──────────────────────────────────────────
  return (
    <div className="wallet-adapter-dropdown" ref={menuRef}>
      <button
        className={baseClass}
        onClick={() => setMenuOpen(o => !o)}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
      >
        {label}
      </button>

      {menuOpen && (
        <ul
          className="wallet-adapter-dropdown-list wallet-adapter-dropdown-list-active"
          role="menu"
          aria-label="Wallet options"
        >
          <li
            className="wallet-adapter-dropdown-list-item"
            role="menuitem"
            onClick={handleChangeWallet}
          >
            Change wallet
          </li>
          <li
            className="wallet-adapter-dropdown-list-item"
            role="menuitem"
            onClick={handleDisconnect}
          >
            Disconnect
          </li>
        </ul>
      )}
    </div>
  );
}
