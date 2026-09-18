/**
 * WalletButton — replaces WalletMultiButton everywhere.
 *
 * Behavioral contract:
 *
 *   When NOT connected, clicking always opens the picker modal.
 *   After the user picks a wallet, connect() fires immediately in two cases:
 *
 *   Case A — user picked a DIFFERENT wallet than was previously selected:
 *     `wallet` changes null→non-null (or old→new). The useEffect on `wallet`
 *     detects this and calls connect() iff justPickedRef is true.
 *
 *   Case B — user picked the SAME wallet that's already selected (but not
 *     connected, e.g. after a failed attempt or page refresh):
 *     WalletProvider's changeWallet() no-ops when walletName===nextWalletName,
 *     so `wallet` never changes and the useEffect never fires. We handle this
 *     by checking at modal-open time: if `wallet` is already set and we open
 *     the picker again (justPickedRef=true), we call connect() directly when
 *     the modal closes (detected by watching `visible` going false) — provided
 *     wallet is still the same non-null value and we're not already connected.
 *
 *   Page-load stale localStorage:
 *     justPickedRef is false on load; useEffect skips connect(). ✓
 *
 *   Connect error / rejection:
 *     Adapter fires 'error' → WalletProvider.handleConnectError → changeWallet(null)
 *     → wallet→null → button returns to "Select Wallet". ✓
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
  const { visible, setVisible } = useWalletModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // True only when the user opened the picker in this browser session.
  const justPickedRef = useRef(false);
  // The wallet name that was already selected when the picker was opened.
  // Used to detect "re-selected same wallet" (Case B above).
  const walletNameAtPickerOpen = useRef<string | null>(null);

  // Case A: wallet changed to non-null after picker was opened → connect.
  useEffect(() => {
    if (wallet && justPickedRef.current) {
      justPickedRef.current = false;
      walletNameAtPickerOpen.current = null;
      connect().catch((err: unknown) => {
        console.error("[WalletButton] connect() rejected:", err);
      });
    }
  }, [wallet, connect]);

  // Case B: modal closed, wallet is still the same non-null value (same wallet
  // re-selected — WalletProvider no-ops on changeWallet when name matches).
  // `visible` going false signals the modal closed.
  useEffect(() => {
    if (
      !visible &&
      justPickedRef.current &&
      wallet &&
      wallet.adapter.name === walletNameAtPickerOpen.current &&
      !connected &&
      !connecting
    ) {
      justPickedRef.current = false;
      walletNameAtPickerOpen.current = null;
      connect().catch((err: unknown) => {
        console.error("[WalletButton] connect() rejected (re-select same wallet):", err);
      });
    }
  }, [visible, wallet, connected, connecting, connect]);

  // Reset on wallet→null (error / disconnect / deselect).
  useEffect(() => {
    if (!wallet) {
      justPickedRef.current = false;
      walletNameAtPickerOpen.current = null;
    }
  }, [wallet]);

  // Close dropdown on outside click / touch.
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
    justPickedRef.current = true;
    // Record which wallet is currently selected (if any) so Case B can
    // detect "user re-selected the same wallet."
    walletNameAtPickerOpen.current = wallet?.adapter.name ?? null;
    setVisible(true);
  }, [setVisible, wallet]);

  const handleDisconnect = useCallback(() => {
    setMenuOpen(false);
    disconnect().catch(() => { });
    select(null);
  }, [disconnect, select]);

  const handleChangeWallet = useCallback(() => {
    setMenuOpen(false);
    justPickedRef.current = true;
    walletNameAtPickerOpen.current = wallet?.adapter.name ?? null;
    setVisible(true);
  }, [setVisible, wallet]);

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
