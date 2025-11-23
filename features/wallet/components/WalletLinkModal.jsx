'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletIcon } from '@/shared/components/Icons';

/**
 * Modal asking user to connect a crypto wallet for payouts or funding.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {'payout'|'funding'} [props.walletType='payout'] - Type of wallet to connect
 */
export default function WalletLinkModal({ isOpen, onClose, walletType = 'payout' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Render nothing if modal is closed
  if (!isOpen) return null;

  /**
   * Handler for redirecting user to wallet linking flow.
   * Preserves the current page URL for return.
   */
  const handleLinkWallet = () => {
    setLoading(true);
    const returnUrl = window.location.pathname + window.location.search;
    router.push(`/link-wallet?returnTo=${encodeURIComponent(returnUrl)}&type=${walletType}`);
  };

  // Determine modal title and description based on wallet type
  const title =
    walletType === 'funding'
      ? 'Connect Funding Wallet'
      : 'Connect Payout Wallet';

  const description =
    walletType === 'funding'
      ? 'You need to connect a wallet to fund bounties. This wallet will be used to send crypto to the bounty escrow contract.'
      : 'You need to connect a wallet to receive bounty payments. This wallet will be used to receive crypto when your PRs are merged.';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <WalletIcon size={32} color="currentColor" />
        </div>

        <h2 className="mb-3 text-center text-2xl font-semibold text-foreground">
          {title}
        </h2>

        <p className="mb-8 text-center text-base text-muted-foreground">
          {description}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
          >
            Cancel
          </button>

          <button
            onClick={handleLinkWallet}
            disabled={loading}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Redirecting...' : 'Link Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

