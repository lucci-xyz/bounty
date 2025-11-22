'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GitHubIcon, CheckCircleIcon } from '@/shared/components/Icons';
import { createSiweMessageText } from '@/shared/lib/siwe-message';
import { useErrorModal } from '@/shared/components/ErrorModalProvider';
import StatusNotice from '@/shared/components/StatusNotice';
import { useGithubUser } from '@/shared/hooks/useGithubUser';
import { getUserProfile } from '@/shared/lib/api/user';
import { getNonce, verifyWalletSignature, linkWallet } from '@/shared/lib/api/wallet';

const cardClasses = 'rounded-3xl border border-border/60 bg-card p-6 shadow-sm';

export default function LinkWallet() {
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(false);
  const [linkedWalletAddress, setLinkedWalletAddress] = useState('');

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showError } = useErrorModal();
  const { githubUser, githubUserLoading, isLocalMode } = useGithubUser();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-link wallet when both conditions met and user doesn't have wallet linked
  useEffect(() => {
    if (githubUser && !hasLinkedWallet && isConnected && address && walletClient && !profileCreated && !isProcessing) {
      createProfileWithWallet();
    }
  }, [githubUser, hasLinkedWallet, isConnected, address, walletClient, profileCreated, isProcessing]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfileStatus() {
      if (githubUserLoading) return;
      if (!githubUser) {
        setHasExistingAccount(false);
        setHasLinkedWallet(false);
        setLinkedWalletAddress('');
        return;
      }
      if (isLocalMode) {
        setHasExistingAccount(false);
        setHasLinkedWallet(false);
        setLinkedWalletAddress('');
        return;
      }

      setCheckingAccount(true);
      try {
        const profile = await getUserProfile();
        if (cancelled) return;
        setHasExistingAccount(Boolean(profile?.user));
        if (profile?.wallet?.walletAddress) {
          setHasLinkedWallet(true);
          setLinkedWalletAddress(profile.wallet.walletAddress);
        } else {
          setHasLinkedWallet(false);
          setLinkedWalletAddress('');
        }
      } catch (error) {
        console.error('Profile lookup failed', error);
      } finally {
        if (!cancelled) {
          setCheckingAccount(false);
        }
      }
    }

    loadProfileStatus();
    return () => {
      cancelled = true;
    };
  }, [githubUser, githubUserLoading, isLocalMode]);

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

      if (!githubUser) {
        throw new Error('Missing GitHub session');
      }

      const { nonce } = await getNonce();

      // Create and sign message
      const messageText = createSiweMessageText({
        domain: window.location.host,
        address,
        statement: 'Link your wallet to receive BountyPay payments.',
        uri: window.location.origin,
        chainId: chain?.id || 1,
        nonce
      });

      const signature = await walletClient.signMessage({
        message: messageText
      });

      setStatus({ message: 'Verifying signature...', type: 'loading' });

      await verifyWalletSignature({
        message: messageText,
        signature
      });

      setStatus({ message: 'Creating your profile...', type: 'loading' });

      await linkWallet({
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        walletAddress: address
      });

      setProfileCreated(true);
      setLinkedWalletAddress(address);
      setStatus({ message: '', type: '' });
      setHasLinkedWallet(true);
      
    } catch (error) {
      console.error(error);
      showError({
        title: 'Wallet Link Failed',
        message: error.message || 'An error occurred while linking your wallet',
        primaryActionLabel: 'Try Again',
        onPrimaryAction: createProfileWithWallet,
      });
    } finally {
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
