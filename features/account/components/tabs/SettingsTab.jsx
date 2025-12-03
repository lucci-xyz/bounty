"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitHubIcon, SettingsIcon, WalletIcon, BellIcon, CheckCircleIcon } from '@shared/components/Icons';
import UserAvatar from '@/shared/components/UserAvatar';
import { requestEmailVerification } from '@/shared/api/user';

/**
 * Displays the user's account settings, including GitHub account info,
 * payout wallet, and logout functionality.
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
      <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in-up">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <GitHubIcon size={16} className="text-muted-foreground" />
            GitHub Account
          </h3>
          <button
            onClick={onManageRepos}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <SettingsIcon size={12} />
            Manage Repos
          </button>
        </div>
        <div className="flex items-center gap-3">
          <UserAvatar username={githubUser.githubUsername} avatarUrl={githubUser.avatarUrl} size={40} />
          <div>
            <div className="text-sm font-medium text-foreground">
              @{githubUser.githubUsername}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {githubUser.githubId}
            </div>
          </div>
        </div>
      </div>

      {/* Payout Wallet */}
      <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in-up">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
          <WalletIcon size={16} className="text-muted-foreground" />
          Payout Wallet
        </h3>
        {profile?.wallet ? (
          <div>
            <div className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">
              Address
            </div>
            <div className="mb-1 break-all font-mono text-sm text-foreground bg-secondary rounded-lg px-3 py-2">
              {profile.wallet.walletAddress.slice(0, 8)}...{profile.wallet.walletAddress.slice(-6)}
            </div>
            <div className="mb-3 text-xs text-muted-foreground">
              Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
              <button
                onClick={openChangeWalletModal}
                className="px-3 py-1.5 rounded-full border border-border text-xs text-foreground hover:bg-secondary transition-colors"
              >
                Change
              </button>
              <button
                onClick={openDeleteWalletModal}
                className="px-3 py-1.5 rounded-full border border-destructive/40 text-xs text-destructive hover:bg-destructive/5 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <WalletIcon size={20} className="text-muted-foreground" />
            </div>
            <p className="mb-3 text-sm text-muted-foreground">No wallet linked</p>
            <Link 
              href="/app/link-wallet?type=payout"
              className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Link Wallet
            </Link>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in-up">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
          <BellIcon size={16} className="text-muted-foreground" />
          Notifications
        </h3>

        {verifiedEmail ? (
          <div>
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="break-all text-sm text-foreground">{verifiedEmail}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                <CheckCircleIcon size={10} />
                Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                className="flex-1 min-w-0 h-9 rounded-full border border-border bg-background px-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="New email"
                value={email !== verifiedEmail ? email : ''}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'loading'}
                autoComplete="email"
              />
              <button
                onClick={handleSendVerification}
                disabled={!email || email === verifiedEmail || !isValidEmail(email) || status === 'loading'}
                className="px-4 py-2 rounded-full border border-border text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? '...' : 'Update'}
              </button>
            </div>
            {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        ) : pendingEmail ? (
          <div>
            <div className="mb-2 flex items-center gap-2 flex-wrap">
              <span className="break-all text-sm text-foreground">{pendingEmail}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                Pending
              </span>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Check your inbox for verification link.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendVerification}
                disabled={status === 'loading'}
                className="px-4 py-2 rounded-full border border-border text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {status === 'loading' ? '...' : 'Resend'}
              </button>
              <button
                onClick={() => { setEmail(''); setMessage(''); setError(''); }}
                className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                Change
              </button>
            </div>
            {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Get notified when bounties are paid.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="email"
                className="flex-1 min-w-0 h-9 rounded-full border border-border bg-background px-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'loading'}
                autoComplete="email"
              />
              <button
                onClick={handleSendVerification}
                disabled={!email || !isValidEmail(email) || status === 'loading'}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? '...' : 'Verify'}
              </button>
            </div>
            {message && <p className="mt-2 text-xs text-emerald-600">{message}</p>}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5 animate-fade-in-up">
        <h3 className="mb-2 text-sm font-medium text-destructive">Sign Out</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          End your session and sign out of BountyPay
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-destructive text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
