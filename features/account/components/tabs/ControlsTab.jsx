"use client";

import { useMemo, useState } from 'react';
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
    showStatus
  } = useBountyVerification();
  const { currentNetwork: network } = useNetwork();
  const [refunded, setRefunded] = useState(false);
  const [custodialStatus, setCustodialStatus] = useState({ message: '', type: '' });
  const [custodialLoading, setCustodialLoading] = useState(false);
  const [payoutStatuses, setPayoutStatuses] = useState({});

  const failedPayouts = useMemo(() => {
    return claimedBounties.filter((bounty) => bounty?.claimStatus === 'failed');
  }, [claimedBounties]);

  const { requestRefund } = useRefundTransaction({
    currentBounty,
    selectedBounty,
    onSuccess: async () => {
      setRefunded(true);
      clearBountyState();
      await fetchEligibleBounties();
    },
    showStatus
  });

  const selectedRefundMeta = selectedBounty?.refundMeta;
  const canSelfRefund = selectedRefundMeta?.canSelfRefund;

  const handleCustodialRefund = async () => {
    if (!selectedBounty) return;
    try {
      setCustodialLoading(true);
      setCustodialStatus({ message: 'Requesting custodial refund...', type: 'loading' });
      const response = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bountyId: selectedBounty.bountyId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to request refund');
      }
      setCustodialStatus({
        message: data?.txHash
          ? `Refund requested. TX: ${data.txHash.slice(0, 10)}...${data.txHash.slice(-6)}`
          : 'Refund request submitted.',
        type: 'success'
      });
      setRefunded(true);
      clearBountyState();
      await fetchEligibleBounties();
    } catch (error) {
      logger.error('Custodial refund request failed:', error);
      setCustodialStatus({
        message: error.message || 'Failed to request custodial refund',
        type: 'error'
      });
    } finally {
      setCustodialLoading(false);
    }
  };

  const handleSelectBounty = async (bounty) => {
    try {
      await verifyBounty(bounty);
      setRefunded(false);
      setCustodialStatus({ message: '', type: '' });
      setCustodialLoading(false);
    } catch (error) {
      // error handled by hook via modal/status
    }
  };

  const sponsorDisplay = useMemo(() => {
    if (!bountyInfo?.sponsor) return '';
    return `${bountyInfo.sponsor.slice(0, 6)}...${bountyInfo.sponsor.slice(-4)}`;
  }, [bountyInfo]);

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

          {bountyInfo && (
            <div className="mt-5 space-y-4">
              <BountyDetails
                bountyInfo={bountyInfo}
                network={network}
                sponsorDisplay={sponsorDisplay}
                linkedWallet={linkedWalletAddress}
                refundMeta={selectedRefundMeta}
              />
              {selectedRefundMeta?.requiresCustodialRefund && (
                <div className="rounded-2xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  <p className="font-medium">Connected wallet does not match the funding wallet.</p>
                  <p>
                    Connect{' '}
                    <code className="text-[10px]">
                      {formatAddress(selectedRefundMeta?.fundingWallet) || 'the funding wallet'}
                    </code>{' '}
                    to self-refund, or request a custodial refund below.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={requestRefund}
                  disabled={refunded || !canSelfRefund}
                  className="w-full rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {canSelfRefund ? (refunded ? 'Refunded' : 'Request Refund') : 'Connect funding wallet to self-refund'}
                </button>
                {!canSelfRefund && (
                  <button
                    type="button"
                    onClick={handleCustodialRefund}
                    disabled={custodialLoading}
                    className="w-full rounded-full border border-border/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {custodialLoading ? 'Requesting...' : 'Request Custodial Refund'}
                  </button>
                )}
                {custodialStatus.message && (
                  <p
                    className={`text-xs ${
                      custodialStatus.type === 'error'
                        ? 'text-destructive'
                        : custodialStatus.type === 'success'
                          ? 'text-green-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {custodialStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}
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
