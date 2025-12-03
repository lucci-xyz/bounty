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
  const paidBounties = claimedBounties.filter((b) => b.claimStatus === 'resolved' || b.claimStatus === 'paid');
  const pendingBounties = claimedBounties.filter((b) => b.claimStatus === 'pending');

  return (
    <>
      {/* Stat blocks for earnings overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatBlock
          className="animate-fade-in-up"
          label="Total Earned"
          value={`$${totalEarned.toLocaleString()}`}
          hint={`${paidBounties.length} bounties`}
          iconBgClass="bg-emerald-50"
          iconTextClass="text-emerald-600"
        />
        <StatBlock
          className="animate-fade-in-up"
          label="Active Claims"
          value={pendingBounties.length}
          hint="Awaiting payout"
          iconBgClass="bg-amber-50"
          iconTextClass="text-amber-600"
        />
        <StatBlock
          className="animate-fade-in-up"
          label="Completed"
          value={paidBounties.length}
          hint="Paid submissions"
          iconBgClass="bg-blue-50"
          iconTextClass="text-blue-600"
        />
      </div>

      {/* Recent earning activity */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden animate-fade-in-up">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-base font-medium text-foreground">Recent Activity</h3>
        </div>

        {/* Empty state if no bounties */}
        {claimedBounties.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't claimed any bounties yet
            </p>
            <Link 
              href="/app"
              className="inline-flex px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Browse Bounties
            </Link>
          </div>
        ) : (
          // List recent (up to 5) claimed bounties
          <div className="divide-y divide-border">
            {claimedBounties.slice(0, 5).map((bounty) => {
              const repoName = bounty.repoFullName;
              const issueLinkParams = {
                repoFullName: repoName,
                issueNumber: bounty.issueNumber
              };
              const isPending = bounty.claimStatus === 'pending';
              const isPaid = bounty.claimStatus === 'resolved' || bounty.claimStatus === 'paid';
              const isFailed = bounty.claimStatus === 'failed';
              
              return (
                <div
                  key={bounty.bountyId}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <LinkFromCatalog
                      section="github"
                      link="issue"
                      params={issueLinkParams}
                      className="text-foreground hover:text-primary transition-colors text-sm font-medium truncate block"
                    >
                      {repoName}#{bounty.issueNumber}
                    </LinkFromCatalog>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isPaid ? 'bg-emerald-50 text-emerald-700' :
                        isPending ? 'bg-amber-50 text-amber-700' :
                        isFailed ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isPending ? 'Pending' : isFailed ? 'Failed' : 'Paid'}
                      </span>
                      {isPaid && bounty.paidAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(bounty.paidAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-instrument-serif text-lg text-foreground">
                      {formatAmount(bounty.amount, bounty.tokenSymbol)}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">
                      {bounty.tokenSymbol}
                    </div>
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

