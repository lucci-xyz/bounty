"use client";

import { useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit';
import { WalletIcon, CheckCircleIcon } from '@/ui/components/Icons';

/**
 * Modal for changing payout wallet that relies on RainbowKit account/connect modals.
 */
export function ChangeWalletModal({
  isOpen,
  onClose,
  status,
  isProcessing,
  onStartChange,
  updatedAddress,
  isAwaitingWallet,
  onCancel,
  initialAddress
}) {
  const { address: connectedAddress, isConnected } = useAccount();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { openAccountModal, accountModalOpen } = useAccountModal();

  const isSuccess = status?.type === 'success';
  const statusMessage = status?.message;
  const isActionDisabled =
    isProcessing ||
    (!openAccountModal && !openConnectModal);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const actionLabel = isAwaitingWallet
    ? 'Waiting for wallet...'
    : isConnected
      ? 'Switch Wallet'
      : 'Connect Wallet';

  const handleWalletAction = useCallback(() => {
    if (!onStartChange) return;

    const started = onStartChange?.(
      () => {
        onClose?.();
      },
      (err) => {
        onCancel?.();
        console.error('Payout wallet change failed:', err);
      }
    );

    if (!started) {
      return;
    }

    if (isConnected) {
      if (openAccountModal) {
        openAccountModal();
      } else {
        openConnectModal?.();
      }
    } else {
      openConnectModal?.();
    }
  }, [isConnected, onStartChange, openAccountModal, openConnectModal, onClose, onCancel]);

  useEffect(() => {
    if (!isAwaitingWallet) return;
    if (connectModalOpen || accountModalOpen) return;
    if (!isConnected) {
      onCancel?.();
      return;
    }
    if (initialAddress && connectedAddress === initialAddress) {
      onCancel?.();
    }
  }, [
    accountModalOpen,
    connectModalOpen,
    isAwaitingWallet,
    isConnected,
    onCancel,
    initialAddress,
    connectedAddress
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={() => !isProcessing && onClose()}
    >
      <div
        className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-lg border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {isSuccess ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircleIcon size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground mb-1">Wallet Updated!</h2>
              <p className="text-sm text-muted-foreground">Your payout wallet is now</p>
              <p className="font-mono text-sm text-foreground mt-1">
                {formatAddress(updatedAddress || connectedAddress)}
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
              Use RainbowKit to connect or switch to the wallet you want to receive payouts.
            </p>

            {statusMessage && !isSuccess && (
              <div
                className={`text-sm text-center mb-4 ${
                  status.type === 'error' ? 'text-destructive' : 'text-muted-foreground'
                }`}
              >
                {statusMessage}
              </div>
            )}

            <button
              onClick={handleWalletAction}
              disabled={isActionDisabled}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <WalletIcon size={16} />
              {actionLabel}
            </button>

            <button
              onClick={onCancel}
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
