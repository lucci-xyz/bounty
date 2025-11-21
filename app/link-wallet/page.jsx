'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GitHubIcon, CheckCircleIcon } from '@/components/Icons';

function createSiweMessage({ domain, address, statement, uri, version, chainId, nonce }) {
  const message = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`
  ].join('\n');

  return message;
}

const cardClasses = 'rounded-3xl border border-border/60 bg-card p-6 shadow-sm';
const iconBubbleClasses = 'flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary';
const statusVariants = {
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error: 'bg-destructive/10 text-destructive border border-destructive/30',
  loading: 'bg-primary/5 text-primary border border-primary/20',
  info: 'bg-muted/40 text-foreground/80 border border-border/60'
};

function StatusNotice({ status, className = '' }) {
  if (!status?.message) return null;
  const variant = statusVariants[status.type] || statusVariants.info;
  const iconMap = {
    success: <CheckCircleIcon size={16} color="currentColor" />,
    error: (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-[11px] font-semibold text-destructive">
        !
      </span>
    ),
    loading: (
      <span className="inline-flex h-5 w-5 items-center justify-center">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </span>
    ),
    info: (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border/70 text-[11px] font-semibold text-foreground/70">
        i
      </span>
    )
  };
  const icon = iconMap[status.type] || iconMap.info;

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${variant} ${className}`}>
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-sm leading-snug">{status.message}</p>
      </div>
    </div>
  );
}

export default function LinkWallet() {
  const [githubUser, setGithubUser] = useState(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [linkedWalletAddress, setLinkedWalletAddress] = useState('');

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    setIsMounted(true);
    
    if (isLocal || useDummyData) {
      setGithubUser({
        githubId: 123456789,
        githubUsername: 'local-dev',
        avatarUrl: null
      });
      setHasExistingAccount(false);
    } else {
      checkGitHubAuth();
    }
  }, []);

  // Auto-link wallet when both conditions met and user doesn't have wallet linked
  useEffect(() => {
    if (githubUser && !hasLinkedWallet && isConnected && address && walletClient && !profileCreated && !isProcessing) {
      createProfileWithWallet();
    }
  }, [githubUser, hasLinkedWallet, isConnected, address, walletClient, profileCreated, isProcessing]);

  const checkGitHubAuth = async () => {
    try {
      const authRes = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (!authRes.ok) {
        return;
      }

      const user = await authRes.json();
      setGithubUser(user);
      
      // Check if user already has a wallet linked
      setCheckingAccount(true);
      const profileRes = await fetch('/api/user/profile', {
        credentials: 'include'
      });

      if (profileRes.ok) {
        const { user: dbUser, wallet } = await profileRes.json();
        
        // User has an existing account
        if (dbUser) {
          setHasExistingAccount(true);
        }
        
        // User has a wallet linked
        if (wallet && wallet.walletAddress) {
          setHasLinkedWallet(true);
          setLinkedWalletAddress(wallet.walletAddress);
        }
      }
      setCheckingAccount(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setCheckingAccount(false);
    }
  };

  const authenticateGitHub = () => {
    const returnUrl = window.location.pathname + window.location.search;
    const authUrl = `/api/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  };

  const createProfileWithWallet = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setStatus({ message: 'Please sign the message in your wallet...', type: 'loading' });

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // Get nonce
      const nonceRes = await fetch('/api/nonce', {
        credentials: 'include'
      });
      const { nonce } = await nonceRes.json();

      // Create and sign message
      const messageText = createSiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Link your wallet to receive BountyPay payments.',
        uri: window.location.origin,
        version: '1',
        chainId: chain?.id || 1,
        nonce
      });

      const signature = await walletClient.signMessage({
        message: messageText
      });

      setStatus({ message: 'Verifying signature...', type: 'loading' });

      // Verify signature
      const verifyRes = await fetch('/api/verify-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: messageText,
          signature
        })
      });

      if (!verifyRes.ok) {
        throw new Error('Signature verification failed');
      }

      setStatus({ message: 'Creating your profile...', type: 'loading' });

      // Link wallet (this creates the user if they don't exist)
      const linkRes = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          githubId: githubUser.githubId,
          githubUsername: githubUser.githubUsername,
          walletAddress: address
        })
      });

      if (!linkRes.ok) {
        throw new Error('Failed to create profile');
      }

      setProfileCreated(true);
      setLinkedWalletAddress(address);
      setStatus({ message: '', type: '' });
      
    } catch (error) {
      console.error(error);
      setStatus({ message: error.message || 'An error occurred', type: 'error' });
      setIsProcessing(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
      </div>
    );
  }

  const displayWalletAddress = address || linkedWalletAddress;
  const shortAddress = displayWalletAddress ? `${displayWalletAddress.slice(0, 8)}...${displayWalletAddress.slice(-6)}` : '';

  const renderFlowCard = () => {
    if (!githubUser) {
      return (
        <section className={cardClasses}>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/70">Step 1</p>
              <h2 className="text-lg font-medium text-foreground">Connect GitHub</h2>
              <p className="text-sm text-muted-foreground">
                Authenticate with GitHub to verify your identity.
              </p>
            </div>
            <button
              onClick={authenticateGitHub}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <GitHubIcon size={18} color="currentColor" />
              Connect with GitHub
            </button>
          </div>
        </section>
      );
    }

    if (checkingAccount) {
      return (
        <section className={`${cardClasses} text-center`}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Checking your account...</p>
        </section>
      );
    }

    if (hasLinkedWallet) {
      return (
        <section className={`${cardClasses} text-center space-y-5`}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircleIcon size={20} color="currentColor" />
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                Ready
              </span>
            </div>
            <h3 className="text-xl font-medium text-foreground">You're all set</h3>
            <p className="text-sm text-muted-foreground">
              Your account is already verified and ready for bounty payouts.
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-left text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-foreground/80">
              <span>GitHub</span>
              <span>@{githubUser.githubUsername}</span>
            </div>
            <hr className="my-3 border-border/40" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Ready to receive payments
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        </section>
      );
    }

    if (profileCreated) {
      return (
        <section className={`${cardClasses} text-center space-y-5`}>
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircleIcon size={20} color="currentColor" />
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
                Linked
              </span>
            </div>
            <h3 className="text-xl font-medium text-foreground">Profile created</h3>
            <p className="text-sm text-muted-foreground">
              You're now eligible to claim bounties automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-border/50 bg-muted/40 p-4 text-left text-sm text-muted-foreground">
            <div className="flex items-center justify-between text-foreground/80">
              <span>GitHub</span>
              <span>@{githubUser.githubUsername}</span>
            </div>
            {shortAddress && (
              <>
                <hr className="my-3 border-border/40" />
                <div className="flex items-center justify-between text-foreground/80">
                  <span>Wallet</span>
                  <span>{shortAddress}</span>
                </div>
              </>
            )}
            <hr className="my-3 border-border/40" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
              Ready to receive payments
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continue
          </button>
        </section>
      );
    }

    if (!isConnected) {
      return (
        <section className={cardClasses}>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/70">Step 2</p>
              <h2 className="text-lg font-medium text-foreground">Connect your wallet</h2>
              <p className="text-sm text-muted-foreground">
                Link a wallet to receive bounty payouts. You'll only sign a verification message—no gas required.
              </p>
            </div>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (openConnectModal) openConnectModal();
                  }}
                  disabled={!isMounted || !openConnectModal}
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </section>
      );
    }

    return (
      <section className={`${cardClasses} text-center space-y-3`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground">Finishing up</h3>
        <p className="text-sm text-muted-foreground">
          {status.message || 'Setting up your profile...'}
        </p>
      </section>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-light text-foreground/90">Claim Bounties</h1>
        <p className="text-sm text-muted-foreground">
          Link your GitHub account and wallet to receive automatic bounty payouts.
        </p>
      </header>

      {(githubUser || address) && (
        <div className={`${cardClasses} flex items-center justify-between text-sm text-muted-foreground`}>
          <div>
            <p className="text-foreground/80">GitHub</p>
            <p className="text-foreground font-medium">{githubUser ? `@${githubUser.githubUsername}` : 'Not connected'}</p>
          </div>
          <div>
            <p className="text-foreground/80">Wallet</p>
            <p className="text-foreground font-medium">
              {shortAddress
                ? shortAddress
                : hasLinkedWallet
                  ? 'Linked'
                  : 'Not connected'}
            </p>
          </div>
        </div>
      )}

      <StatusNotice status={status} />

      {renderFlowCard()}
    </div>
  );
}
