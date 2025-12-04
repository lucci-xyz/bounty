"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
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
  if (!isOpen) return null;

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isProcessing = status?.type === 'info' || status?.message?.includes('...');

  return (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"
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

            <ConnectButton.Custom>
              {({ openAccountModal, openConnectModal }) => (
                <button
                  onClick={() => {
                    // Try openAccountModal first, fallback to openConnectModal
                    if (openAccountModal) {
                      openAccountModal();
                    } else if (openConnectModal) {
                      openConnectModal();
                    }
                  }}
                  disabled={isProcessing}
                  className="w-full py-2.5 border border-border rounded-full text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  Switch Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect a wallet to set as your payout address.
            </p>

            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={() => openConnectModal && openConnectModal()}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <WalletIcon size={16} />
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
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
