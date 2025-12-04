"use client";

import { useCallback, useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { WalletIcon } from '@/ui/components/Icons';

/**
 * Modal for changing payout wallet.
 * Forces users to connect a wallet and automatically links it once connected.
 */
export function ChangeWalletModal({ 
  isOpen, 
  onClose, 
  connectedAddress, 
  isConnected, 
  onConfirm, 
  status 
}) {
  const { disconnect } = useDisconnect();
  const isProcessing = status?.type === 'info' || status?.message?.includes('...');
  const lastLinkedAddressRef = useRef(null);

  // Reset previous attempts and disconnect any existing wallet when modal opens
  useEffect(() => {
    if (!isOpen) return;
    lastLinkedAddressRef.current = null;

    // Ensure RainbowKit prompts for a new wallet every time
    disconnect();
  }, [isOpen, disconnect]);

  // Automatically trigger the change flow when a wallet connects
  useEffect(() => {
    if (!isOpen) return;
    if (!isConnected || !connectedAddress) return;
    if (lastLinkedAddressRef.current === connectedAddress) return;

    lastLinkedAddressRef.current = connectedAddress;
    onConfirm?.();
  }, [isOpen, isConnected, connectedAddress, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-lg border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-medium text-foreground text-center mb-2">
          Change Payout Wallet
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Connect a wallet to set as your payout address.
        </p>

        {/* Status message */}
        {status?.message && (
          <div className={`text-sm text-center mb-4 ${
            status.type === 'error' ? 'text-destructive' : 
            status.type === 'success' ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {status.message}
          </div>
        )}

        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={() => openConnectModal?.()}
              disabled={isProcessing}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <WalletIcon size={16} />
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
