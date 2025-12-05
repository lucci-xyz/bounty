"use client";

import { useCallback, useEffect, useState } from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { WalletIcon, CheckCircleIcon } from '@/ui/components/Icons';

/**
 * Modal for changing payout wallet.
 * Disconnects any existing wallet when opened so the connect modal is available.
 * Then re-processes when a new wallet connects.
 */
export function ChangeWalletModal({ 
  isOpen, 
  onClose, 
  connectedAddress, 
  isConnected, 
  onConfirm, 
  onInitiateChange,
  status 
}) {
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const isProcessing = status?.type === 'info' || status?.message?.includes('...');
  const isSuccess = status?.type === 'success';
  const [isReady, setIsReady] = useState(false);

  // When modal opens, disconnect any existing wallet so openConnectModal becomes available
  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
      return;
    }

    // If connected, disconnect first so RainbowKit's connect modal is available
    if (isConnected) {
      disconnect();
    }
    
    // Small delay to ensure disconnect completes and openConnectModal becomes available
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, [isOpen, isConnected, disconnect]);

  // Handle the connect wallet button click
  const handleConnectClick = useCallback(() => {
    if (!openConnectModal) return;
    
    // Tell the parent we're initiating a wallet change
    // This stores the current address and sets up the listener
    onInitiateChange?.();
    
    // Close our modal and open RainbowKit immediately
    onClose();
    openConnectModal();
  }, [onClose, onInitiateChange, openConnectModal]);

  if (!isOpen) return null;

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-lg border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success state */}
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircleIcon size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">
                Wallet Updated!
              </h2>
              <p className="text-sm text-muted-foreground">
                Your payout wallet has been changed to
              </p>
              <p className="font-mono text-sm text-foreground mt-1">
                {formatAddress(connectedAddress)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-medium text-foreground text-center mb-2">
              Change Payout Wallet
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Connect a wallet to set as your payout address.
            </p>

            {/* Status message (for processing/error states) */}
            {status?.message && !isSuccess && (
              <div className={`text-sm text-center mb-4 ${
                status.type === 'error' ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {status.message}
              </div>
            )}

            <button
              onClick={handleConnectClick}
              disabled={isProcessing || !isReady || !openConnectModal}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <WalletIcon size={16} />
              {isReady ? 'Connect Wallet' : 'Preparing...'}
            </button>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
