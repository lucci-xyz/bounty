'use client';

import Link from 'next/link';
import { TargetIcon, PlusIcon, WalletIcon } from '@/components/Icons';

/**
 * Empty state for dashboard when user has no bounties and no wallet
 */
export default function EmptyState() {
  return (
    <div className="empty-state animate-fade-in-up delay-100">
      <div className="empty-state-icon w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" 
           style={{ background: 'rgba(131, 238, 232, 0.15)' }}>
        <TargetIcon size={40} color="var(--color-primary)" />
      </div>

      <h2 className="empty-state-title">
        Welcome to Your Dashboard
      </h2>
      
      <p className="empty-state-description">
        Connect a wallet to fund your first bounty and start attracting contributors to your GitHub issues.
      </p>

      <div className="empty-state-actions">
        <Link href="/link-wallet?type=funding">
          <button className="btn btn-primary">
            <WalletIcon size={18} />
            Connect Wallet
          </button>
        </Link>
        
        <Link href="/attach-bounty">
          <button className="btn btn-secondary">
            <PlusIcon size={18} />
            Create First Bounty
          </button>
        </Link>
      </div>

      <div className="mt-15 p-8 rounded-xl text-left" 
           style={{ background: 'rgba(131, 238, 232, 0.08)' }}>
        <h3 className="text-lg mb-4 font-semibold">
          How it works
        </h3>
        <div className="grid gap-4">
          <div className="flex gap-3">
            <div className="min-w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              1
            </div>
            <div>
              <div className="text-base font-semibold mb-1">
                Connect your funding wallet
              </div>
              <div className="text-sm text-secondary">
                Link a wallet that you'll use to send crypto to bounties
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="min-w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              2
            </div>
            <div>
              <div className="text-base font-semibold mb-1">
                Attach a bounty to a GitHub issue
              </div>
              <div className="text-sm text-secondary">
                Choose any issue and fund it with crypto
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="min-w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
              3
            </div>
            <div>
              <div className="text-base font-semibold mb-1">
                Payments happen automatically
              </div>
              <div className="text-sm text-secondary">
                When a PR is merged, funds release to the contributor
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

