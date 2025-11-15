'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WalletIcon, CheckCircleIcon } from '@/components/Icons';

export default function WalletLinkModal({ isOpen, onClose, walletType = 'payout' }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLinkWallet = () => {
    setLoading(true);
    // Preserve current URL to return to after linking
    const returnUrl = window.location.pathname + window.location.search;
    router.push(`/link-wallet?returnTo=${encodeURIComponent(returnUrl)}&type=${walletType}`);
  };

  const title = walletType === 'funding' 
    ? 'Connect Funding Wallet' 
    : 'Connect Payout Wallet';
  
  const description = walletType === 'funding'
    ? 'You need to connect a wallet to fund bounties. This wallet will be used to send crypto to the bounty escrow contract.'
    : 'You need to connect a wallet to receive bounty payments. This wallet will be used to receive crypto when your PRs are merged.';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '16px',
          background: 'rgba(131, 238, 232, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <WalletIcon size={32} color="var(--color-primary)" />
        </div>

        <h2 style={{
          fontSize: '24px',
          fontFamily: "'Space Grotesk', sans-serif",
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          {title}
        </h2>

        <p style={{
          fontSize: '15px',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          lineHeight: '1.6',
          marginBottom: '32px'
        }}>
          {description}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '2px solid var(--color-border)',
              background: 'white',
              color: 'var(--color-text-primary)',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-background-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleLinkWallet}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: loading ? 'var(--color-text-secondary)' : 'var(--color-primary)',
              color: 'white',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--color-primary-medium)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'var(--color-primary)';
              }
            }}
          >
            {loading ? 'Redirecting...' : 'Link Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

