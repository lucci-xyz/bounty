"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitHubIcon, SettingsIcon, WalletIcon, BellIcon, CheckCircleIcon } from '@shared/components/Icons';
import UserAvatar from '@/shared/components/UserAvatar';
import { requestEmailVerification } from '@/shared/api/user';

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
 * @param {Function} props.refreshProfile - Refreshes user profile data
 * @param {Function} props.logout - Logs out the user
 */
export function SettingsTab({
  githubUser,
  profile,
  onManageRepos,
  openChangeWalletModal,
  openDeleteWalletModal,
  logout,
  refreshProfile
}) {
  const verifiedEmail = profile?.user?.email || '';
  const pendingEmail = profile?.emailVerification?.email || '';
  const [email, setEmail] = useState(verifiedEmail || pendingEmail || '');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Simple email validation
  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  useEffect(() => {
    setEmail(verifiedEmail || pendingEmail || '');
  }, [verifiedEmail, pendingEmail]);

  const handleSendVerification = async () => {
    if (!email || !isValidEmail(email)) return;
    setStatus('loading');
    setMessage('');
    setError('');

    try {
      await requestEmailVerification(email);
      setStatus('success');
      setMessage('Verification email sent. Please check your inbox.');
      refreshProfile?.();
    } catch (err) {
      setStatus('error');
      setError(err?.message || 'Unable to send verification email');
    } finally {
      setStatus('idle');
    }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* GitHub Account */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 animate-fade-in-up delay-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <GitHubIcon size={16} />
            GitHub Account
          </h3>
          <button
            onClick={onManageRepos}
            className="premium-btn flex items-center gap-1 border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground"
          >
            <SettingsIcon size={12} />
            Manage
          </button>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar username={githubUser.githubUsername} avatarUrl={githubUser.avatarUrl} size={40} />
          <div>
            <div className="text-sm font-medium text-foreground">
              @{githubUser.githubUsername}
            </div>
            <div className="text-xs font-light text-muted-foreground">
              ID: {githubUser.githubId}
            </div>
          </div>
        </div>
      </div>

      {/* Payout Wallet */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 animate-fade-in-up delay-150">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <WalletIcon size={16} />
          Payout Wallet
        </h3>
        {profile?.wallet ? (
          <div>
            <div className="mb-0.5 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Address
            </div>
            <div className="mb-1 break-all font-mono text-sm text-foreground">
              {profile.wallet.walletAddress.slice(0, 8)}...{profile.wallet.walletAddress.slice(-6)}
            </div>
            <div className="mb-3 text-xs font-light text-muted-foreground">
              Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={openChangeWalletModal}
                className="premium-btn border border-border bg-transparent px-2 py-1 text-xs text-foreground"
              >
                Change
              </button>
              <button
                onClick={openDeleteWalletModal}
                className="premium-btn border border-destructive/60 bg-transparent px-2 py-1 text-xs text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="mb-2 text-sm font-light text-muted-foreground">No wallet linked</p>
            <Link href="/app/link-wallet?type=payout">
              <button className="premium-btn bg-primary text-primary-foreground text-xs px-3 py-1.5">Link Wallet</button>
            </Link>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border/40 rounded-2xl p-5 animate-fade-in-up delay-200">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <BellIcon size={16} />
          Notifications
        </h3>

        {verifiedEmail ? (
          <div>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="break-all text-sm text-foreground">{verifiedEmail}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                <CheckCircleIcon size={10} />
                Verified
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <input
                type="email"
                className="w-36 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/10"
                placeholder="New email"
                value={email !== verifiedEmail ? email : ''}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'loading'}
                autoComplete="email"
              />
              <button
                onClick={handleSendVerification}
                disabled={!email || email === verifiedEmail || !isValidEmail(email) || status === 'loading'}
                className="premium-btn border border-border bg-transparent px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? '…' : 'Update'}
              </button>
            </div>
            {message && <p className="mt-2 text-xs font-medium text-foreground">{message}</p>}
            {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
          </div>
        ) : pendingEmail ? (
          <div>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="break-all text-sm text-foreground">{pendingEmail}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                Pending
              </span>
            </div>
            <p className="mb-2 text-xs font-light text-muted-foreground">
              Check inbox for verification link.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendVerification}
                disabled={status === 'loading'}
                className="premium-btn border border-border bg-transparent px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? '…' : 'Resend'}
              </button>
              <button
                onClick={() => { setEmail(''); setMessage(''); setError(''); }}
                className="premium-btn border border-border bg-transparent px-2 py-1 text-xs text-muted-foreground"
              >
                Change
              </button>
            </div>
            {message && <p className="mt-2 text-xs font-medium text-foreground">{message}</p>}
            {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs font-light text-muted-foreground">
              Get notified when bounties are paid.
            </p>
            <div className="inline-flex items-center gap-2">
              <input
                type="email"
                className="w-36 rounded-lg border border-border/60 bg-background px-2 py-1 text-xs text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/10"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'loading'}
                autoComplete="email"
              />
              <button
                onClick={handleSendVerification}
                disabled={!email || !isValidEmail(email) || status === 'loading'}
                className="premium-btn bg-primary text-primary-foreground px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === 'loading' ? '…' : 'Verify'}
              </button>
            </div>
            {message && <p className="mt-2 text-xs font-medium text-foreground">{message}</p>}
            {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 animate-fade-in-up delay-250">
        <h3 className="mb-2 text-sm font-medium text-destructive">Logout</h3>
        <p className="mb-3 text-xs font-light text-muted-foreground">
          End your session and sign out
        </p>
        <button
          onClick={logout}
          className="premium-btn bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
