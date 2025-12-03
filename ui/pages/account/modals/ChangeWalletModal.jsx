"use client";

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertIcon, WalletIcon } from '@/ui/components/Icons';

/**
 * Modal that allows the user to change their payout wallet address.
 *
 * @param {Object}   props
 * @param {Object}   props.changeModal - Modal control object (isOpen, isProcessing, status, close).
 * @param {boolean}  props.isConnected - True if a wallet is currently connected.
 * @param {string}   props.address - The currently connected wallet address.
 */
export function ChangeWalletModal({ changeModal, isConnected, address }) {
  // Hide modal if not open
  if (!changeModal.isOpen) {
    return null;
  }

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

        {/* Info / warning alert */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertIcon size={20} color="var(--accent)" />
          </div>
          <p
            className="text-muted-foreground"
            style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, fontWeight: 300 }}
          >
            The new wallet will be used for <strong>all active and future bounty payments</strong>
          </p>
        </div>

        {/* Status message (e.g. success, error) */}
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

        {/* Wallet connect section */}
        <div className="mb-5">
          <p
            className="text-muted-foreground mb-3"
            style={{ fontSize: '13px', fontWeight: 400 }}
          >
            Connect your new wallet:
          </p>

          {/* Connect Button from RainbowKit */}
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (openConnectModal) openConnectModal();
                }}
                disabled={changeModal.isProcessing || !openConnectModal}
                className="premium-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2"
                style={{ padding: '12px', fontSize: '14px' }}
              >
                <WalletIcon size={18} />
                {isConnected && address
                  ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Connect Wallet'}
              </button>
            )}
          </ConnectButton.Custom>
        </div>

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
            opacity: changeModal.isProcessing ? 0.5 : 1
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

