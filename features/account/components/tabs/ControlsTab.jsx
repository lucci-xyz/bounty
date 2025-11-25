"use client";

import { useEffect, useMemo, useState } from 'react';
import { logger } from '@/shared/lib/logger';

const formatAddress = (address) => {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

import { EligibleBountiesList } from '@/features/refund/components/EligibleBountiesList';
import { BountyDetails } from '@/features/refund/components/BountyDetails';
import { useEligibleRefundBounties } from '@/features/refund/hooks/useEligibleRefundBounties';
import { useBountyVerification } from '@/features/refund/hooks/useBountyVerification';
import { useRefundTransaction } from '@/features/refund/hooks/useRefundTransaction';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { formatAmount } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * ControlsTab
 *
 * Displays refund-related lists so sponsors can surface actions that need manual attention.
 *
 * @param {Object} props
 * @param {Array} props.claimedBounties - Claimed bounties returned by the earnings dashboard.
 */
export function ControlsTab({ claimedBounties = [], githubUser, linkedWalletAddress }) {
  const { eligibleBounties, loadingBounties, fetchEligibleBounties } = useEligibleRefundBounties({
    sessionGithubId: githubUser?.githubId,
    linkedWalletAddress
  });
  const {
    bountyInfo,
    currentBounty,
    selectedBounty,
    verifyBounty,
    clearBountyState,
    showStatus,
    status
  } = useBountyVerification();
  const { currentNetwork: network } = useNetwork();
  const { address, isConnected } = useAccount();
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [payoutStatuses, setPayoutStatuses] = useState({});
  const [lastVerifiedWallet, setLastVerifiedWallet] = useState(null);

  const failedPayouts = useMemo(() => {
    return claimedBounties.filter((bounty) => bounty?.claimStatus === 'failed');
  }, [claimedBounties]);

  const { requestRefund } = useRefundTransaction({
    currentBounty,
    selectedBounty,
    onSuccess: async () => {
      await fetchEligibleBounties();
      setRefundModalOpen(false);
      clearBountyState();
      setLastVerifiedWallet(address || null);
    },
    showStatus
  });

  const handleSelectBounty = async (bounty) => {
    try {
      await verifyBounty(bounty);
      setLastVerifiedWallet(address || null);
      setRefundModalOpen(true);
    } catch (error) {
      // error handled by hook via modal/status
    }
  };

  const sponsorDisplay = useMemo(() => {
    if (!bountyInfo?.sponsor) return '';
    return `${bountyInfo.sponsor.slice(0, 6)}...${bountyInfo.sponsor.slice(-4)}`;
  }, [bountyInfo]);

  const fundingWallet = selectedBounty?.refundMeta?.fundingWallet || bountyInfo?.sponsor;
  const normalizedFunding = fundingWallet?.toLowerCase?.() || null;
  const normalizedConnected = address?.toLowerCase?.() || null;
  const walletMatches = Boolean(normalizedFunding && normalizedConnected && normalizedFunding === normalizedConnected);

  const handleManualPayout = async (payout) => {
    if (!payout?.claimId) return;

    setPayoutStatuses((prev) => ({
      ...prev,
      [payout.claimId]: { loading: true, message: '', type: '' }
    }));

    try {
      const response = await fetch('/api/payout/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ claimId: payout.claimId })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Payout retry failed');
      }

      setPayoutStatuses((prev) => ({
        ...prev,
        [payout.claimId]: {
          loading: false,
          message: data?.txHash
            ? `Payout sent. TX: ${data.txHash.slice(0, 10)}...${data.txHash.slice(-6)}`
            : 'Payout sent.',
          type: 'success'
        }
      }));
    } catch (error) {
      logger.error('Manual payout retry failed:', error);
      setPayoutStatuses((prev) => ({
        ...prev,
        [payout.claimId]: {
          loading: false,
          message: error.message || 'Payout retry failed',
          type: 'error'
        }
      }));
    }
  };

  // Re-verify when the connected wallet changes while the modal is open
  useEffect(() => {
    const shouldReverify = refundModalOpen && selectedBounty && (normalizedConnected !== lastVerifiedWallet);
    if (!shouldReverify) return;

    verifyBounty(selectedBounty)
      .then(() => setLastVerifiedWallet(normalizedConnected || null))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedConnected, refundModalOpen, selectedBounty?.bountyId]);

  return (
    <div className="space-y-8 text-sm font-light text-muted-foreground">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[32px] border border-border/60 bg-card p-6 shadow-sm">
          <header className="mb-4">
            <div>
              <h3 className="font-light text-foreground">Eligible refunds</h3>
            </div>
          </header>

          <EligibleBountiesList
            bounties={eligibleBounties}
            loading={loadingBounties}
            selectedBounty={selectedBounty}
            onSelectBounty={handleSelectBounty}
          />
        </section>

        <section className="rounded-[32px] border border-border/60 bg-card p-6 shadow-sm">
          <header className="mb-4">
            <div>
              <h3 className="font-light text-foreground">Failed payouts</h3>
            </div>
          </header>

          <FailedPayoutList
            payouts={failedPayouts}
            payoutStatuses={payoutStatuses}
            onRetryPayout={handleManualPayout}
          />
        </section>
      </div>

      <RefundModal
        open={refundModalOpen}
        onClose={() => {
          setRefundModalOpen(false);
          clearBountyState();
        }}
        bountyInfo={bountyInfo}
        network={network}
        sponsorDisplay={sponsorDisplay}
        refundMeta={selectedBounty?.refundMeta}
        selectedBounty={selectedBounty}
        requestRefund={requestRefund}
        status={status}
        walletMatches={walletMatches}
        connectWalletLabel={
          isConnected && address
            ? `Connected: ${formatAddress(address)}`
            : 'Connect wallet'
        }
      />
    </div>
  );
}

function FailedPayoutList({ payouts = [], onRetryPayout, payoutStatuses = {} }) {
  if (payouts.length === 0) {
    return (
      <div className="text-center text-sm font-light text-muted-foreground">
        No failed payouts detected. Every claim is either pending or resolved.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payouts.map((payout) => (
        <div
          key={`${payout.bountyId}-${payout.prNumber || 'claim'}`}
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <LinkFromCatalog
                section="github"
                link="issue"
                params={{
                  repoFullName: payout.repoFullName,
                  issueNumber: payout.issueNumber
                }}
                className="text-foreground text-sm font-medium transition-colors hover:text-primary"
              >
                {payout.repoFullName}#{payout.issueNumber}
              </LinkFromCatalog>
              <p className="text-xs text-muted-foreground">
                PR #{payout.prNumber || '—'} attempted payout
              </p>
            </div>

            <div className="text-right text-xs font-medium uppercase tracking-[0.35em] text-destructive">
              Failed
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-muted-foreground text-xs md:grid-cols-2">
            <div className="flex items-center justify-between gap-3 md:justify-start">
              <span className="text-foreground">
                {formatAmount(payout.amount, payout.tokenSymbol)} {payout.tokenSymbol}
              </span>
              <span className="rounded-full bg-destructive/10 px-2 py-1 text-[10px] uppercase tracking-wide text-destructive">
                {payout.network || 'Unknown network'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 md:justify-end">
              <span className="font-mono text-[11px] text-destructive/80">
                {payout.txHash ? `${payout.txHash.slice(0, 10)}...` : 'No tx recorded'}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-muted-foreground">
              Payout failed when the PR was merged. Retry below once your wallet is linked.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRetryPayout?.(payout)}
                disabled={!payout.claimId || payoutStatuses[payout.claimId]?.loading}
                className="rounded-full border border-destructive/50 px-4 py-2 text-xs font-semibold text-destructive transition-colors hover:border-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {payoutStatuses[payout.claimId]?.loading ? 'Retrying...' : 'Retry payout'}
              </button>
            </div>
          </div>
          {payout.claimId && payoutStatuses[payout.claimId]?.message && (
            <div
              className={`mt-2 text-[12px] ${
                payoutStatuses[payout.claimId]?.type === 'error'
                  ? 'text-destructive'
                  : 'text-green-600'
              }`}
            >
              {payoutStatuses[payout.claimId]?.message}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RefundModal({
  open,
  onClose,
  bountyInfo,
  network,
  sponsorDisplay,
  refundMeta,
  selectedBounty,
  requestRefund,
  status,
  walletMatches,
  connectWalletLabel
}) {
  const fundingWallet = refundMeta?.fundingWallet || bountyInfo?.sponsor;
  const connectedWallet = refundMeta?.connectedWallet;
  const canRefund = Boolean(walletMatches && bountyInfo?.canSelfRefund);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border/70 bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Refund bounty</p>
            <h3 className="text-lg font-medium text-foreground">
              {selectedBounty?.repoFullName ? `${selectedBounty.repoFullName}#${selectedBounty.issueNumber}` : 'Selected bounty'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            ✕
          </button>
        </div>

        {!walletMatches ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="text-foreground mb-2 font-medium">Connect your funding wallet</p>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-foreground">
                <span className="text-muted-foreground">Required</span>
                <code className="text-[11px]">{fundingWallet ? formatAddress(fundingWallet) : '—'}</code>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2 text-xs text-foreground mt-2">
                <span className="text-muted-foreground">Connected</span>
                <code className="text-[11px]">
                  {connectedWallet ? formatAddress(connectedWallet) : 'Not connected'}
                </code>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Connect the funding wallet to continue.
              </p>
            </div>
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (openConnectModal) openConnectModal();
                  }}
                  className="w-full rounded-full border border-border/60 bg-foreground text-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-foreground/90"
                >
                  {connectWalletLabel}
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : (
          <div className="space-y-4">
            {bountyInfo && (
              <BountyDetails
                bountyInfo={bountyInfo}
                network={network}
                sponsorDisplay={sponsorDisplay}
                linkedWallet={connectedWallet}
                refundMeta={{ ...refundMeta, canSelfRefund: walletMatches }}
              />
            )}
            <button
              type="button"
              onClick={requestRefund}
              className="w-full rounded-full bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Request refund
            </button>
            {status?.message && (
              <p
                className={`text-center text-xs ${
                  status.type === 'error'
                    ? 'text-destructive'
                    : status.type === 'success'
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                }`}
              >
                {status.message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
