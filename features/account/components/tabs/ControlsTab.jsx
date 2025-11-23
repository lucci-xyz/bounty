"use client";

import { useMemo, useState } from 'react';

import { EligibleBountiesList } from '@/features/refund/components/EligibleBountiesList';
import { BountyDetails } from '@/features/refund/components/BountyDetails';
import { useEligibleRefundBounties } from '@/features/refund/hooks/useEligibleRefundBounties';
import { useBountyVerification } from '@/features/refund/hooks/useBountyVerification';
import { useRefundTransaction } from '@/features/refund/hooks/useRefundTransaction';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { formatAmount } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';
import { dummyFailedPayouts } from '@data/refund';

/**
 * ControlsTab
 *
 * Displays refund-related lists so sponsors can surface actions that need manual attention.
 *
 * @param {Object} props
 * @param {Array} props.claimedBounties - Claimed bounties returned by the earnings dashboard.
 * @param {boolean} props.useDummyData - Show pre-seeded refund content for UX demos.
 */
export function ControlsTab({ claimedBounties = [], useDummyData = false }) {
  const { eligibleBounties, loadingBounties, fetchEligibleBounties } = useEligibleRefundBounties({
    useDummyData
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
  const [dummyRefunded, setDummyRefunded] = useState(false);
  const [dummySelectedBounty, setDummySelectedBounty] = useState(null);
  const [dummyCurrentBounty, setDummyCurrentBounty] = useState(null);
  const [dummyBountyInfo, setDummyBountyInfo] = useState(null);

  const selectedBountyPreview = useMemo(
    () => (useDummyData ? dummySelectedBounty : selectedBounty),
    [dummySelectedBounty, selectedBounty, useDummyData]
  );
  const currentBountyPreview = useMemo(
    () => (useDummyData ? dummyCurrentBounty : currentBounty),
    [dummyCurrentBounty, currentBounty, useDummyData]
  );
  const bountyInfoPreview = useMemo(
    () => (useDummyData ? dummyBountyInfo : bountyInfo),
    [dummyBountyInfo, bountyInfo, useDummyData]
  );

  const failedPayouts = useMemo(() => {
    if (useDummyData) {
      return dummyFailedPayouts;
    }

    return claimedBounties.filter((bounty) => bounty?.claimStatus === 'failed');
  }, [claimedBounties, useDummyData]);

  const { requestRefund } = useRefundTransaction({
    currentBounty: currentBountyPreview,
    selectedBounty: selectedBountyPreview,
    onSuccess: async () => {
      setRefunded(true);
      clearBountyState();
      await fetchEligibleBounties();
    },
    showStatus
  });

  const handleDummySelection = (bounty) => {
    const info = {
      amount: formatAmount(bounty.amount, bounty.tokenSymbol),
      deadline: new Date(Number(bounty.deadline) * 1000).toISOString().split('T')[0],
      status: 'Open',
      sponsor: bounty.sponsor || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    };

    setDummySelectedBounty(bounty);
    setDummyCurrentBounty(bounty);
    setDummyBountyInfo(info);
    setDummyRefunded(false);
  };

  const handleSelectBounty = async (bounty) => {
    if (useDummyData) {
      handleDummySelection(bounty);
      return;
    }

    try {
      await verifyBounty(bounty);
      setRefunded(false);
    } catch (error) {
      // error handled by hook via modal/status
    }
  };

  const handleDummyRefund = () => {
    setDummyRefunded(true);
    setDummySelectedBounty(null);
    setDummyCurrentBounty(null);
    setDummyBountyInfo(null);
  };

  const sponsorDisplay = useMemo(() => {
    if (!bountyInfoPreview?.sponsor) return '';
    return `${bountyInfoPreview.sponsor.slice(0, 6)}...${bountyInfoPreview.sponsor.slice(-4)}`;
  }, [bountyInfoPreview]);

  return (
    <div className="space-y-8 text-sm font-light text-muted-foreground">
      <section className="rounded-[32px] border border-border/60 bg-card p-6 shadow-sm">
        <header className="ml-2 flex items-center justify-between">
          <div>
            <h3 className="mb-6 text-lg font-medium text-foreground">Eligible refunds</h3>
          </div>
        </header>

        <EligibleBountiesList
          bounties={eligibleBounties}
          loading={loadingBounties}
          selectedBounty={selectedBountyPreview}
          onSelectBounty={handleSelectBounty}
        />

        {bountyInfoPreview && (
          <div className="mt-5 space-y-4">
            <BountyDetails bountyInfo={bountyInfoPreview} network={network} sponsorDisplay={sponsorDisplay} />
            <button
              type="button"
              onClick={useDummyData ? handleDummyRefund : requestRefund}
              disabled={useDummyData ? dummyRefunded : refunded}
              className="w-full rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {useDummyData
                ? dummyRefunded
                  ? 'Refund simulated'
                  : 'Simulate refund'
                : refunded
                ? 'Refunded'
                : 'Request Refund'}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-border/60 bg-card p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="ml-2 text-lg font-medium text-foreground">Failed Payouts</h3>
          </div>
        </header>

        <FailedPayoutList payouts={failedPayouts} />
      </section>
    </div>
  );
}

function FailedPayoutList({ payouts = [] }) {
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
          <div className="mt-3 flex items-center justify-between gap-3 text-muted-foreground">
            <span>
              {formatAmount(payout.amount, payout.tokenSymbol)} {payout.tokenSymbol}
            </span>
            <span className="font-mono text-[11px] text-destructive/80">
              {payout.txHash ? `${payout.txHash.slice(0, 10)}...` : 'No tx yet'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

