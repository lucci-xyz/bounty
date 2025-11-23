"use client";

import Link from 'next/link';
import { GitHubIcon, SettingsIcon, WalletIcon } from '@shared/components/Icons';
import UserAvatar from '@/shared/components/UserAvatar';

/**
 * Displays the user's account settings, including GitHub account info,
 * payout wallet, and logout functionality.
 *
 * @param {Object} props
 * @param {Object} props.githubUser - GitHub user information
 * @param {Object} props.profile - User profile, may include wallet info
 * @param {Function} props.onManageRepos - Opens manage repositories modal
 * @param {Function} props.openChangeWalletModal - Opens change wallet modal
 * @param {Function} props.openDeleteWalletModal - Opens delete wallet modal
 * @param {Function} props.logout - Logs out the user
 */
export function SettingsTab({
  githubUser,
  profile,
  onManageRepos,
  openChangeWalletModal,
  openDeleteWalletModal,
  logout
}) {
  return (
    <>
      {/* GitHub Account and Payout Wallet sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* GitHub Account */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <GitHubIcon size={18} />
              GitHub Account
            </h3>
            <button
              onClick={onManageRepos}
              className="premium-btn flex items-center gap-1.5 border border-border bg-transparent px-3 py-1.5 text-sm text-muted-foreground"
            >
              <SettingsIcon size={14} />
              Manage repos
            </button>
          </div>
          <div className="flex items-center gap-3">
            <UserAvatar username={githubUser.githubUsername} avatarUrl={githubUser.avatarUrl} size={48} />
            <div>
              <div className="mb-0.5 text-sm font-medium text-foreground">
                @{githubUser.githubUsername}
              </div>
              <div className="text-sm font-light text-muted-foreground">
                ID: {githubUser.githubId}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Wallet */}
        <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-200">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <WalletIcon size={18} />
            Payout Wallet
          </h3>
          {profile?.wallet ? (
            <div>
              <div className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Address
              </div>
              <div className="mb-2 break-all font-mono text-sm text-foreground">
                {profile.wallet.walletAddress.slice(0, 10)}...{profile.wallet.walletAddress.slice(-8)}
              </div>
              <div className="mb-4 text-xs font-light text-muted-foreground">
                Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={openChangeWalletModal}
                  className="premium-btn border border-border bg-transparent px-3 py-1.5 text-sm text-foreground"
                >
                  Change Wallet
                </button>
                <button
                  onClick={openDeleteWalletModal}
                  className="premium-btn border border-destructive bg-transparent px-3 py-1.5 text-sm text-destructive"
                >
                  Delete Wallet
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="mb-3 text-sm font-light text-muted-foreground">No wallet linked</p>
              <Link href="/link-wallet?type=payout">
                <button className="premium-btn bg-primary text-primary-foreground text-sm">Link Wallet</button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Logout section */}
      <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-6 animate-fade-in-up delay-300">
        <h3 className="mb-2 text-sm font-medium text-destructive">Logout</h3>
        <p className="mb-4 text-sm font-light text-muted-foreground">
          End your session and sign out of your account
        </p>
        <button
          onClick={logout}
          className="premium-btn bg-destructive px-5 py-2 text-sm text-destructive-foreground"
        >
          Logout
        </button>
      </div>
    </>
  );
}
