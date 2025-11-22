'use client';

/**
 * LinkWallet page lets users connect their GitHub account and wallet
 * to enable automatic bounty payouts.
 */

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GitHubIcon, CheckCircleIcon } from '@/shared/components/Icons';
import StatusNotice from '@/shared/components/StatusNotice';
import { useLinkWalletFlow } from '@/features/wallet';

// Card container style
const cardClasses = 'rounded-3xl border border-border/60 bg-card p-6 shadow-sm';

/**
 * LinkWallet page component.
 */
export default function LinkWallet() {
  // Get state and actions for the wallet/GitHub linking flow
  const {
    state: {
      hasLinkedWallet,
      profileCreated,
      status,
      isMounted,
      checkingAccount,
      shortAddress,
      displayWalletAddress,
    },
    wallet,
    github,
    actions: { authenticateGitHub, createProfileWithWallet },
  } = useLinkWalletFlow();

  // Show loading message while mounting
  if (!isMounted) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
      </div>
    );
  }

  /**
   * Render the flow card depending on what step the user is in.
   */
  const renderFlowCard = () => {
    // Step 1: Connect GitHub
    if (!github.user) {
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

    // Show account check loading state
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

    // Show if the account already has a linked wallet
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
              <span>@{github.user?.githubUsername}</span>
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

    // Show after profile is created and linked
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
              <span>@{github.user?.githubUsername}</span>
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

    // Step 2: Connect wallet if not yet connected
    if (!wallet.isConnected) {
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

    // Show generic loading step if still in process
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
      {/* Page header */}
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-light text-foreground/90">Claim Bounties</h1>
        <p className="text-sm text-muted-foreground">
          Link your GitHub account and wallet to receive automatic bounty payouts.
        </p>
      </header>

      {/* Show connection summary if either GitHub or wallet is present */}
      {(github.user || wallet.address) && (
        <div className={`${cardClasses} flex items-center justify-between text-sm text-muted-foreground`}>
          <div>
            <p className="text-foreground/80">GitHub</p>
            <p className="text-foreground font-medium">
              {github.user ? `@${github.user.githubUsername}` : 'Not connected'}
            </p>
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

      {/* Show flow status messages */}
      <StatusNotice status={status} />

      {/* Show the main flow card */}
      {renderFlowCard()}
    </div>
  );
}
