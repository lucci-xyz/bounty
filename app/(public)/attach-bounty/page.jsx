'use client';

import { useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MoneyIcon, GitHubIcon } from '@/shared/components/Icons';
import BetaAccessModal from '@/features/beta-access/components/BetaAccessModal';
import StatusNotice from '@/shared/components/StatusNotice';
import { useAttachBountyForm } from '@/features/bounty/hooks/useAttachBountyForm';

function AttachBountyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const issueData = useMemo(
    () => ({
      repoFullName: searchParams.get('repo'),
      issueNumber: searchParams.get('issue'),
      repoId: searchParams.get('repoId'),
      installationId: searchParams.get('installationId'),
      presetAmount: searchParams.get('amount')
    }),
    [searchParams]
  );

  const {
    amount,
    setAmount,
    deadline,
    setDeadline,
    status,
    isProcessing,
    isMounted,
    showBetaModal,
    betaLoading,
    hasAccess,
    hideBetaModal,
    supportedNetworkNames,
    isChainSupported,
    network,
    wallet,
    hasIssueData,
    fundBounty
  } = useAttachBountyForm({ issueData });

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Don't render wallet controls until mounted (prevents hydration mismatch)
  if (!isMounted || betaLoading) {
    return (
      <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-md rounded-[32px] border border-border/60 bg-card p-10 text-center shadow-[0_40px_120px_rgba(15,23,42,0.12)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoneyIcon size={24} color="currentColor" />
          </div>
          <p className="text-sm text-muted-foreground">Preparing bounty flow...</p>
        </div>
      </div>
    );
  }

  const betaModal = (
    <BetaAccessModal
      isOpen={!hasAccess && showBetaModal}
      onClose={handleBack}
      onDismiss={handleBack}
      dismissLabel="Back"
      onAccessGranted={() => {
        hideBetaModal();
        router.refresh();
      }}
    />
  );

  // Direct visit - show setup options
  if (!hasIssueData) {
    return (
      <>
        <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-[36px] border border-border/60 bg-card p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-8">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-light text-foreground/90">Create Bounty</h1>
              <p className="text-sm text-muted-foreground">
                Install the Lucci GitHub App to start funding issues directly from GitHub.
              </p>
            </div>

            <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-medium text-foreground">Install GitHub App</h3>
                <p className="text-sm text-muted-foreground">
                  Add BountyPay to your repo, then trigger the “Attach Bounty” action from any issue.
                </p>
              </div>
              <a
                href="https://github.com/apps/bountypay"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <GitHubIcon size={18} color="white" />
                <span className="text-white">Install GitHub App</span>
              </a>
            </div>

            <div className="rounded-3xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
              Once installed, open any issue and hit “Attach Bounty” to land back on this page with the issue pre-filled.
            </div>
          </div>
        </div>
        {betaModal}
      </>
    );
  }

  // From GitHub App - existing flow
  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light text-foreground/90">Attach Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Fund this GitHub issue in crypto. Funds release automatically when the PR merges.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/40 p-6 text-sm text-muted-foreground">
          <div className="flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between text-foreground">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Repository</span>
              <span className="font-medium">{repoFullName}</span>
            </div>
            <div className="flex items-center justify-between text-foreground">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground/70">Issue</span>
              <span className="font-medium">#{issueNumber}</span>
            </div>
            <a
              href={`https://github.com/${repoFullName}/issues/${issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:opacity-80"
            >
              View on GitHub →
            </a>
          </div>
        </div>

        {!wallet.isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  openConnectModal?.();
                }}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isMounted || !openConnectModal}
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
              <div className="flex items-center justify-between text-foreground">
                <span>Connected</span>
                <span className="font-medium">{wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground mt-2">
                <span>Network</span>
                <span className="font-medium">{wallet.chain?.name || network?.name} ({network?.token.symbol})</span>
              </div>
            </div>

            {!isChainSupported && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Connected network ({chain?.name || `Chain ID ${chain?.id}`}) isn’t supported while {networkGroup === 'mainnet' ? 'mainnet' : 'testnet'} mode is active. Supported networks: {supportedNetworkNames.length ? supportedNetworkNames.join(', ') : 'None'}.
              </div>
            )}

            <ConnectButton.Custom>
              {({ openAccountModal, openChainModal }) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openAccountModal?.();
                    }}
                    disabled={!isMounted || !openAccountModal}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Change Wallet
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      openChainModal?.();
                    }}
                    disabled={!isMounted || !openChainModal}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Switch Network
                  </button>
                </div>
              )}
            </ConnectButton.Custom>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                  Bounty Amount ({network?.token.symbol || 'TOKEN'})
                </label>
                <input
                  type="number"
                  min="1"
                  step={network?.token.decimals === 18 ? '0.0001' : '0.01'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <button
              onClick={fundBounty}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Processing...' : 'Fund Bounty'}
            </button>
          </div>
        )}

        <StatusNotice status={status} />
      </div>
      {betaModal}
    </div>
  );
}

export default function AttachBounty() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl px-5 py-24 text-center text-muted-foreground">Loading...</div>}>
      <AttachBountyContent />
    </Suspense>
  );
}
