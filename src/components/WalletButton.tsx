/**
 * WalletButton — replaces WalletMultiButton everywhere.
 *
 * Behavioral contract:
 *
 *   When NOT connected:
 *   - Always opens the wallet picker modal on click. Never auto-connects to
 *     whatever wallet name is sitting in localStorage from a previous session.
 *     (This was the Round 14 fix: a stale 'Mobile Wallet Adapter' entry was
 *     causing WalletMultiButton to skip the picker and go to a dead state.)
 *
 *   After the user picks a wallet IN THIS SESSION (in the modal):
 *   - Calls connect() immediately. This is the path that was accidentally
 *     removed in Round 14 along with the stuck-picker fix.
 *
 *   Telling the two cases apart:
 *   - justPickedRef starts false and is only set true when THIS component
 *     opens the modal (i.e. a live user action). It is never true on page
 *     load. When the wallet context's `wallet` changes from null → non-null
 *     AND justPickedRef is true, connect() is called and the flag is cleared.
 *     This mirrors @solana/wallet-adapter-react's own hasUserSelectedAWallet
 *     pattern (WalletProvider.js line 130) which is private to that package.
 *
 *   When connected:
 *   - Shows truncated address. Click opens dropdown with "Change wallet" and
 *     "Disconnect".
 *   - Disconnect calls both disconnect() and select(null) to clear localStorage.
 *
 *   On connect error / user rejection:
 *   - The adapter fires an error → WalletProvider's handleConnectError calls
 *     changeWallet(null) → localStorage cleared → wallet → null → button
 *     returns to "Select Wallet". justPickedRef is reset on the same cycle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function WalletButton({ className }: { className?: string }) {
  const {
    wallet,
    connected,
    connecting,
    disconnecting,
    publicKey,
    connect,
    disconnect,
    select,
  } = useWallet();
  const { setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // True only when the user opened the picker in this browser session.
  // False on page load — even if localStorage contains a wallet name.
  const justPickedRef = useRef(false);

  // When wallet goes from null → non-null AND the user just picked it in
  // this session, trigger connect() immediately.
  useEffect(() => {
    if (wallet && justPickedRef.current) {
      justPickedRef.current = false;
      connect().catch((err: unknown) => {
        // DO NOT swallow this error silently. Log it so it's visible in the
        // browser console for debugging (e.g. WalletNotReadyError, WalletConnectionError).
        // WalletProvider's handleConnectError clears the selection after this.
        console.error("[WalletButton] connect() rejected:", err);
      });
    }
  }, [wallet, connect]);

  // Reset justPickedRef if wallet becomes null (error / disconnect / deselect)
  // so a stale true value can never cause a spurious connect on next selection.
  useEffect(() => {
    if (!wallet) {
      justPickedRef.current = false;
    }
  }, [wallet]);

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
    // Mark that the next wallet selection came from a live user action
    // in this session — not from restored localStorage state.
    justPickedRef.current = true;
    setVisible(true);
  }, [setVisible]);

  const handleDisconnect = useCallback(() => {
    setMenuOpen(false);
    disconnect().catch(() => { });
    select(null);
  }, [disconnect, select]);

  const handleChangeWallet = useCallback(() => {
    setMenuOpen(false);
    // Re-opening the picker counts as a new pick action
    justPickedRef.current = true;
    setVisible(true);
  }, [setVisible]);

  // ── Label ─────────────────────────────────────────────────────────────────
  let label: string;
  if (connecting) label = "Connecting…";
  else if (disconnecting) label = "Disconnecting…";
  else if (connected && publicKey) {
    const b = publicKey.toBase58();
    label = b.slice(0, 4) + "…" + b.slice(-4);
  } else {
    label = "Select Wallet";
  }

  const baseClass =
    `wallet-adapter-button wallet-adapter-button-trigger` +
    (className ? ` ${className}` : "");

  // ── Not connected ─────────────────────────────────────────────────────────
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

  // ── Connected: address + dropdown ─────────────────────────────────────────
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
