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

/**
 * ControlsTab
 *
 * Displays refund-related lists so sponsors can surface actions that need manual attention.
 *
 * @param {Object} props
 * @param {Array} props.claimedBounties - Claimed bounties returned by the earnings dashboard.
 */
export function ControlsTab({ claimedBounties = [] }) {
  const { eligibleBounties, loadingBounties, fetchEligibleBounties } = useEligibleRefundBounties();
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

  const handleSelectBounty = async (bounty) => {
    try {
      await verifyBounty(bounty);
      setRefunded(false);
    } catch (error) {
      // error handled by hook via modal/status
    }
  };

  const sponsorDisplay = useMemo(() => {
    if (!bountyInfo?.sponsor) return '';
    return `${bountyInfo.sponsor.slice(0, 6)}...${bountyInfo.sponsor.slice(-4)}`;
  }, [bountyInfo]);

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
              <BountyDetails bountyInfo={bountyInfo} network={network} sponsorDisplay={sponsorDisplay} />
              <button
                type="button"
                onClick={requestRefund}
                disabled={refunded}
                className="w-full rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refunded ? 'Refunded' : 'Request Refund'}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-[32px] border border-border/60 bg-card p-6 shadow-sm">
          <header className="mb-4">
            <div>
              <h3 className="font-light text-foreground">Failed payouts</h3>
            </div>
          </header>

          <FailedPayoutList payouts={failedPayouts} />
        </section>
      </div>
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

