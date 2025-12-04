"use client";

import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { WalletIcon } from '@/ui/components/Icons';

/**
 * Modal for changing payout wallet.
 * Always prompts user to connect a fresh wallet and automatically links it.
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
  
  // Track the address we started with and whether we've already processed the new connection
  const initialAddressRef = useRef(null);
  const hasTriggeredConfirmRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  // When modal opens, disconnect any existing wallet and prepare for fresh connection
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      initialAddressRef.current = null;
      hasTriggeredConfirmRef.current = false;
      setIsReady(false);
      return;
    }

    // Store the initial address (if any) so we can detect when a NEW wallet connects
    initialAddressRef.current = connectedAddress || null;
    hasTriggeredConfirmRef.current = false;

    // Disconnect any existing wallet so user starts fresh
    if (isConnected) {
      disconnect();
    }
    
    // Small delay to ensure disconnect completes before showing connect button
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, [isOpen]); // Only run when isOpen changes, not on every render

  // Automatically trigger confirm when a NEW wallet connects (not the one we started with)
  useEffect(() => {
    if (!isOpen || !isReady) return;
    if (!isConnected || !connectedAddress) return;
    if (hasTriggeredConfirmRef.current) return;
    
    // Only trigger if this is a different wallet than we started with
    // (or if there was no wallet when modal opened)
    if (connectedAddress === initialAddressRef.current) return;

    hasTriggeredConfirmRef.current = true;
    onConfirm?.();
  }, [isOpen, isReady, isConnected, connectedAddress, onConfirm]);

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
              disabled={isProcessing || !isReady}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <WalletIcon size={16} />
              {isReady ? 'Connect Wallet' : 'Preparing...'}
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
