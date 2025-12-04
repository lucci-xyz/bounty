"use client";

import { useCallback } from 'react';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { WalletIcon } from '@/ui/components/Icons';

/**
 * Simple modal for changing payout wallet.
 * Shows connected wallet and asks user to confirm the change.
 */
export function ChangeWalletModal({ 
  isOpen, 
  onClose, 
  connectedAddress, 
  isConnected, 
  onConfirm, 
  status 
}) {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { disconnect } = useDisconnect();

  const formatAddress = useCallback((addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const isProcessing = status?.type === 'info' || status?.message?.includes('...');

  const handleSwitchWallet = useCallback(() => {
    console.log('[ChangeWalletModal] Switch wallet clicked');
    console.log('[ChangeWalletModal] openAccountModal:', typeof openAccountModal);
    console.log('[ChangeWalletModal] openConnectModal:', typeof openConnectModal);
    
    // Close our modal first to avoid z-index conflicts with RainbowKit
    onClose();
    
    // Small delay to let our modal close, then open RainbowKit
    setTimeout(() => {
      if (typeof openAccountModal === 'function') {
        console.log('[ChangeWalletModal] Opening account modal');
        openAccountModal();
      } else if (typeof openConnectModal === 'function') {
        console.log('[ChangeWalletModal] Fallback: disconnect and open connect modal');
        disconnect();
        openConnectModal();
      } else {
        console.error('[ChangeWalletModal] No modal function available!');
      }
    }, 150);
  }, [onClose, openAccountModal, openConnectModal, disconnect]);

  const handleDisconnectAndConnect = useCallback(() => {
    console.log('[ChangeWalletModal] Disconnect and connect clicked');
    
    // Close our modal first
    onClose();
    
    // Disconnect current wallet and open connect modal
    setTimeout(() => {
      disconnect();
      if (typeof openConnectModal === 'function') {
        openConnectModal();
      }
    }, 150);
  }, [onClose, disconnect, openConnectModal]);

  const handleConnectWallet = useCallback(() => {
    console.log('[ChangeWalletModal] Connect wallet clicked');
    console.log('[ChangeWalletModal] openConnectModal:', typeof openConnectModal);
    
    // Close our modal first to avoid z-index conflicts
    onClose();
    
    setTimeout(() => {
      if (typeof openConnectModal === 'function') {
        openConnectModal();
      } else {
        console.error('[ChangeWalletModal] openConnectModal not available!');
      }
    }, 150);
  }, [onClose, openConnectModal]);

  // Don't render if not open, but hooks are already called above
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
        <h2 className="text-lg font-medium text-foreground text-center mb-4">
          Change Payout Wallet
        </h2>

        {/* Status message */}
        {status?.message && (
          <div className={`text-sm text-center mb-4 ${
            status.type === 'error' ? 'text-destructive' : 
            status.type === 'success' ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {status.message}
          </div>
        )}

        {/* Connected wallet section */}
        {isConnected && connectedAddress ? (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
              <p className="font-mono text-sm text-foreground">{formatAddress(connectedAddress)}</p>
            </div>

            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Use This Wallet'}
            </button>

            <button
              onClick={handleSwitchWallet}
              disabled={isProcessing}
              className="w-full py-2.5 border border-border rounded-full text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Switch Wallet
            </button>

            <button
              onClick={handleDisconnectAndConnect}
              disabled={isProcessing}
              className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Disconnect &amp; Connect Different Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect a wallet to set as your payout address.
            </p>

            <button
              onClick={handleConnectWallet}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <WalletIcon size={16} />
              Connect Wallet
            </button>
          </div>
        )}

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
