"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertIcon, WalletIcon, CheckCircleIcon } from '@/ui/components/Icons';

/**
 * Modal that allows the user to change their payout wallet address.
 * 
 * Flow:
 * 1. Show current payout wallet
 * 2. User clicks "Connect New Wallet" to open RainbowKit
 * 3. After connecting, show preview of both wallets
 * 4. User must click "Confirm Change" to trigger SIWE signing
 *
 * @param {Object}   props
 * @param {Object}   props.changeModal - Modal control object (isOpen, isProcessing, status, close, handleChangeWallet).
 * @param {boolean}  props.isConnected - True if a wallet is currently connected via RainbowKit.
 * @param {string}   props.address - The currently connected wallet address (from RainbowKit).
 * @param {string}   props.currentPayoutWallet - The wallet address currently saved as payout wallet in database.
 */
export function ChangeWalletModal({ changeModal, isConnected, address, currentPayoutWallet }) {
  // Hide modal if not open
  if (!changeModal.isOpen) {
    return null;
  }

  // Format addresses for display
  const formatAddress = (addr) => {
    if (!addr) return 'Not set';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Check if the connected wallet is different from current payout wallet
  const isDifferentWallet = isConnected && address && currentPayoutWallet && 
    address.toLowerCase() !== currentPayoutWallet.toLowerCase();

  // Check if connected wallet is the same as current payout wallet
  const isSameWallet = isConnected && address && currentPayoutWallet &&
    address.toLowerCase() === currentPayoutWallet.toLowerCase();

  return (
    // Modal overlay (click to close, unless processing)
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
      onClick={() => !changeModal.isProcessing && changeModal.close()}
    >
      {/* Modal container */}
      <div
        className="bg-card rounded-2xl max-w-md w-full p-8 shadow-lg relative border border-border/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon at top */}
        <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <WalletIcon size={28} color="var(--accent)" />
        </div>

        {/* Modal title */}
        <h2
          className="text-foreground text-center mb-3"
          style={{ fontSize: '20px', fontWeight: 500 }}
        >
          Change Payout Wallet
        </h2>

        {/* Current wallet display */}
        <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 mb-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Current Payout Wallet
          </div>
          <div className="font-mono text-sm text-foreground">
            {formatAddress(currentPayoutWallet)}
          </div>
        </div>

        {/* Info / warning alert */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-5 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertIcon size={18} color="var(--accent)" />
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: '13px', lineHeight: 1.5, margin: 0, fontWeight: 300 }}
          >
            The new wallet will be used for <strong>all future bounty payments</strong>. Make sure you have access to this wallet.
          </p>
        </div>

        {/* Status message (e.g. success, error, loading) */}
        {changeModal.status.message && (
          <div
            className={`rounded-xl p-3 mb-5 text-center ${
              changeModal.status.type === 'success'
                ? 'bg-primary/10 border border-primary/30 text-primary'
                : changeModal.status.type === 'error'
                  ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                  : 'bg-accent/10 border border-accent/30 text-accent'
            }`}
            style={{ fontSize: '13px', fontWeight: 400 }}
          >
            {changeModal.status.message}
          </div>
        )}

        {/* Step 1: Connect new wallet */}
        {!isDifferentWallet && !changeModal.isProcessing && (
          <div className="mb-5">
            <p
              className="text-muted-foreground mb-3"
              style={{ fontSize: '13px', fontWeight: 400 }}
            >
              {isSameWallet 
                ? 'Connected wallet is the same as your current payout wallet. Connect a different wallet:'
                : 'Connect your new wallet:'}
            </p>

            <ConnectButton.Custom>
              {({ openConnectModal, openAccountModal }) => (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    // If already connected, open account modal to switch
                    // Otherwise open connect modal
                    if (isConnected && openAccountModal) {
                      openAccountModal();
                    } else if (openConnectModal) {
                      openConnectModal();
                    }
                  }}
                  className="premium-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2"
                  style={{ padding: '12px', fontSize: '14px' }}
                >
                  <WalletIcon size={18} />
                  {isConnected ? 'Switch Wallet' : 'Connect Wallet'}
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        )}

        {/* Step 2: Preview and confirm (only show when different wallet is connected) */}
        {isDifferentWallet && !changeModal.isProcessing && (
          <div className="mb-5">
            {/* Visual change indicator */}
            <div className="flex items-center justify-center gap-3 mb-4 py-3 px-4 bg-secondary/30 rounded-xl">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Current</div>
                <div className="font-mono text-xs text-foreground/70">
                  {formatAddress(currentPayoutWallet)}
                </div>
              </div>
              <span className="text-muted-foreground text-lg">→</span>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">New</div>
                <div className="font-mono text-xs text-primary font-medium">
                  {formatAddress(address)}
                </div>
              </div>
            </div>

            <button
              onClick={changeModal.handleChangeWallet}
              className="premium-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2"
              style={{ padding: '12px', fontSize: '14px' }}
            >
              <CheckCircleIcon size={18} />
              Confirm Change
            </button>
            
            <p className="text-xs text-muted-foreground text-center mt-2">
              You'll be asked to sign a message to verify ownership
            </p>
          </div>
        )}

        {/* Processing state */}
        {changeModal.isProcessing && (
          <div className="mb-5 flex items-center justify-center gap-3 py-4">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Processing...</span>
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={changeModal.close}
          disabled={changeModal.isProcessing}
          className="premium-btn w-full"
          style={{
            padding: '10px',
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            fontSize: '14px',
            opacity: changeModal.isProcessing ? 0.5 : 1,
            cursor: changeModal.isProcessing ? 'not-allowed' : 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
