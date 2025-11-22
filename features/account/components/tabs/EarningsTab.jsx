"use client";

import Link from 'next/link';
import { StatBlock } from '@/features/account/components/StatBlock';
import { formatAmount } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';

/**
 * EarningsTab shows a summary of user's earned bounties and recent activity.
 *
 * @param {Object} props
 * @param {Array} props.claimedBounties - List of bounties claimed by the user.
 * @param {number} props.totalEarned - Total USD earned by the user.
 */
export function EarningsTab({ claimedBounties, totalEarned }) {
  return (
    <>
      {/* Stat blocks for earnings overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatBlock
          className="animate-fade-in-up delay-100"
          label="Total Earned"
          value={`$${totalEarned.toLocaleString()}`}
          hint={`${claimedBounties.filter((b) => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length} bounties`}
          valueClassName="text-primary"
        />
        <StatBlock
          className="animate-fade-in-up delay-200"
          label="Active Claims"
          value={claimedBounties.filter((b) => b.claimStatus === 'pending').length}
          hint="Awaiting payout"
          valueClassName="text-primary"
        />
        <StatBlock
          className="animate-fade-in-up delay-300"
          label="Completed"
          value={claimedBounties.filter((b) => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length}
          hint="Paid submissions"
          valueClassName="text-primary"
        />
      </div>

      {/* Recent earning activity */}
      <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-700">
        <h3 className="mb-6 text-lg font-medium text-foreground">Recent Activity</h3>
        <div className="border-t border-border/40 mb-3" />

        {/* Empty state if no bounties */}
        {claimedBounties.length === 0 ? (
          <div className="text-center py-10 px-5">
            <p className="text-sm font-light text-muted-foreground mb-4">
              You haven't claimed any bounties yet
            </p>
            <Link href="/">
              <button className="premium-btn bg-primary text-primary-foreground">
                Browse Bounties
              </button>
            </Link>
          </div>
        ) : (
          // List recent (up to 5) claimed bounties
          <div className="space-y-4">
            {claimedBounties.slice(0, 5).map((bounty) => {
              const repoName = bounty.repoFullName;
              const issueLinkParams = {
                repoFullName: repoName,
                issueNumber: bounty.issueNumber
              };
              return (
                <div
                  key={bounty.bountyId}
                  className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
                >
                  <div>
                    <LinkFromCatalog
                      section="github"
                      link="issue"
                      params={issueLinkParams}
                      className="text-foreground hover:text-primary transition-colors text-sm font-light tracking-tight mb-1 inline-block opacity-90"
                    >
                      {repoName}
                    </LinkFromCatalog>
                    <div className="text-muted-foreground text-[13px] font-light">
                      {bounty.paidAt
                        ? `Paid ${new Date(bounty.paidAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}`
                        : 'Paid Recent'}
                    </div>
                  </div>
                  <div className="text-foreground text-base font-light tracking-tight text-[#0D473F]">
                    {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

