'use client';

/**
 * Attach Bounty page allows users to fund a GitHub issue with crypto.
 * Handles main logic and view for connecting wallet, setting bounty amount and deadline.
 */

import { useMemo, Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import BetaAccessModal from '@/ui/pages/beta/BetaAccessModal';
import StatusNotice from '@/ui/components/StatusNotice';
import TokenSelectorModal from '@/ui/components/TokenSelectorModal';
import DatePickerModal from '@/ui/components/DatePickerModal';
import { useAttachBountyForm } from '@/ui/hooks/useAttachBountyForm';
import {
  AttachBountyLoadingState,
  DirectSetupSection,
  IssueSummaryCard,
  WalletSummaryCard,
  NetworkWarningBanner
} from '@/ui/pages/bounty/AttachBountySections';
import { goBackOrPush } from '@/lib/navigation';

/**
 * Main content for the Attach Bounty flow.
 */
function AttachBountyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Extract issue info from search params
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

  // Get state and actions from the attach bounty form hook
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
    fundingSummary,
    networkGroup,
    wallet,
    hasIssueData,
    fundBounty,
    betaProgramEnabled,
    // Token selection (multi-token support)
    availableTokens,
    selectedToken,
    selectedTokenIndex,
    setSelectedTokenIndex,
    multiTokenEnabled
  } = useAttachBountyForm({ issueData });

  // Navigate back (or push) handler - wrapped in useCallback for stability
  const handleBack = useCallback(() => goBackOrPush(router), [router]);

  // Track if modal was opened - once opened, keep it open until dismissed or access granted
  // This prevents flickering when beta access state updates during loading
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const modalOpenedRef = useRef(false);
  
  // Token selector modal state
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  
  // Date picker modal state
  const [dateModalOpen, setDateModalOpen] = useState(false);
  
  useEffect(() => {
    // Only update when not loading and conditions change
    if (betaLoading) return;
    
    // Open modal if user doesn't have access and showBetaModal is true
    if (!hasAccess && showBetaModal && !modalOpenedRef.current) {
      setModalIsOpen(true);
      modalOpenedRef.current = true;
    }
    // Close modal if access is granted
    if (hasAccess && modalOpenedRef.current) {
      setModalIsOpen(false);
      modalOpenedRef.current = false;
    }
  }, [betaLoading, hasAccess, showBetaModal]); // Removed modalIsOpen from deps to prevent circular updates

  // Stable callback for modal close - prevents flickering from inline function re-creation
  const handleModalClose = useCallback(() => {
    setModalIsOpen(false);
    modalOpenedRef.current = false;
    hideBetaModal();
    handleBack();
  }, [hideBetaModal, handleBack]);

  // Stable callback for access granted - prevents flickering from inline function re-creation
  const handleAccessGranted = useCallback(() => {
    setModalIsOpen(false);
    modalOpenedRef.current = false;
    hideBetaModal();
    // Refresh the page to update beta access state
    // Use a small delay to ensure modal closes smoothly
    setTimeout(() => {
      router.refresh();
    }, 100);
  }, [hideBetaModal, router]);

  /**
   * Modal for beta access.
   * Shown if user does not have access.
   * Once opened, stays open until dismissed or access is granted (prevents flickering during loading).
   */
  const betaModal = betaProgramEnabled ? (
    <BetaAccessModal
      isOpen={modalIsOpen}
      onClose={handleModalClose}
      onDismiss={handleModalClose}
      dismissLabel="Back"
      onAccessGranted={handleAccessGranted}
    />
  ) : null;

  // Show a loading state while mounting or fetching beta status
  if (!isMounted || betaLoading) {
    return (
      <>
        <AttachBountyLoadingState />
        {betaModal}
      </>
    );
  }

  // If visiting directly (no issue info), show direct setup section
  if (!hasIssueData) {
    return (
      <>
        <DirectSetupSection onBack={handleBack} />
        {betaModal}
      </>
    );
  }

  // Show the Attach Bounty form and flow
  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-start justify-center overflow-visible">
      <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6 mt-10 overflow-visible">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        {/* Page header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light text-foreground/90">Attach Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Fund this GitHub issue in crypto. Funds release automatically when the PR merges.
          </p>
        </div>
        {/* Issue summary card */}
        <IssueSummaryCard repoFullName={issueData.repoFullName} issueNumber={issueData.issueNumber} />

        {/* If wallet not connected, show connect button */}
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
            {/* Wallet/account summary and network info */}
            <WalletSummaryCard wallet={wallet} network={network} />
            <NetworkWarningBanner
              isChainSupported={isChainSupported}
              chain={wallet.chain}
              networkGroup={networkGroup}
              supportedNetworkNames={supportedNetworkNames}
            />

            {/* Wallet/account actions (change wallet, network, or token) */}
            <ConnectButton.Custom>
              {({ openConnectModal, openChainModal, openAccountModal }) => {
                return (
                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (openAccountModal) {
                          openAccountModal();
                        } else {
                          openConnectModal?.();
                        }
                      }}
                      disabled={!isMounted}
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
                    {/* Always show token selector button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setTokenModalOpen(true);
                      }}
                      disabled={!isMounted}
                      className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selectedToken?.symbol || network?.token?.symbol || 'Token'}
                    </button>
                  </div>
                );
              }}
            </ConnectButton.Custom>

            {/* Token selector modal */}
            <TokenSelectorModal
              isOpen={tokenModalOpen}
              onClose={() => setTokenModalOpen(false)}
              tokens={availableTokens}
              selectedIndex={selectedTokenIndex}
              onSelect={setSelectedTokenIndex}
            />

            {/* Bounty details form + summary */}
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 space-y-4 overflow-visible">
              {/* Bounty amount input */}
              <div>
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Bounty Amount ({selectedToken?.symbol || network?.token.symbol || 'TOKEN'})
                </label>
                <input
                  type="number"
                  min="1"
                  step={selectedToken?.decimals === 18 ? '0.0001' : '0.01'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-full border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                  placeholder="500"
                />
              </div>

              {/* Deadline input */}
              <div className="relative">
                <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  Deadline
                </label>
                <button
                  type="button"
                  onClick={() => setDateModalOpen(true)}
                  className="w-full rounded-full border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 text-left flex items-center justify-between"
                >
                  <span className={deadline ? 'text-foreground' : 'text-muted-foreground'}>
                    {deadline ? new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : 'Select date'}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                    <path d="M5 2V4M11 2V4M2 7H14M4 3H12C13.1046 3 14 3.89543 14 5V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V5C2 3.89543 2.89543 3 4 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <DatePickerModal
                  isOpen={dateModalOpen}
                  onClose={() => setDateModalOpen(false)}
                  value={deadline}
                  onChange={setDeadline}
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Summary breakdown */}
              <div className="pt-3 border-t border-border/40 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">Bounty (claimer receives)</span>
                  <span className="font-medium text-foreground">
                    {fundingSummary.amountFormatted} {fundingSummary.tokenSymbol || selectedToken?.symbol || 'TOKEN'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Platform fee ({(fundingSummary.feeBps / 100).toFixed(2)}%)
                  </span>
                  <span className="font-medium text-foreground">
                    {fundingSummary.feeFormatted} {fundingSummary.tokenSymbol || selectedToken?.symbol || 'TOKEN'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <span className="text-muted-foreground text-xs">Total you pay</span>
                  <span className="font-semibold text-foreground">
                    {fundingSummary.totalFormatted} {fundingSummary.tokenSymbol || selectedToken?.symbol || 'TOKEN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fund bounty button */}
            <button
              onClick={fundBounty}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? 'Processing...' : 'Fund Bounty'}
            </button>
          </div>
        )}

        {/* Status and error/info messages */}
        <StatusNotice status={status} />
      </div>
      {betaModal}
    </div>
  );
}

/**
 * Wraps AttachBountyContent in a Suspense boundary with a loading fallback.
 */
export default function AttachBounty() {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-xl px-5 py-24 text-center text-muted-foreground">Loading...</div>}>
      <AttachBountyContent />
    </Suspense>
  );
}

