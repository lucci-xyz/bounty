"use client";

/**
 * SponsoredTab component
 *
 * Displays statistics and active sponsored bounties for the current account.
 * Shows wallet connection prompt if no wallet is linked.
 *
 * @param {Object} props
 * @param {boolean} props.showEmptyState - Whether to show the empty state (connect wallet) prompt.
 * @param {Object} props.stats - Stats for sponsored bounties (e.g., totalValueLocked, totalPaid, refundedBounties).
 * @param {Array} props.displayBounties - Array of bounty objects to display.
 * @param {number} props.totalPages - Total number of bounty pages.
 * @param {number} props.currentPage - Current page in the bounties list.
 * @param {function} props.handlePrevPage - Handler to go to the previous page.
 * @param {function} props.handleNextPage - Handler to go to the next page.
 * @param {string|null} props.expandedBountyId - The currently expanded bounty's id or null.
 * @param {function} props.handleToggleBounty - Handler for expanding/collapsing a bounty card.
 * @param {Object} props.allowlists - Allowlist addresses by bounty id.
 * @param {Object} props.allowlistLoading - Loading state for each bounty's allowlist.
 * @param {function} props.openAllowlistModal - Handler to open the manage allowlist modal.
 */
import Link from 'next/link';
import { ArrowIcon, MoneyIcon, PlusIcon, WalletIcon } from '@shared/components/Icons';
import { StatBlock } from '@/features/account/components/StatBlock';
import { formatAmount, formatDeadlineDate, formatTimeLeft } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';
import { useFlag } from '@/shared/providers/FlagProvider';

export function SponsoredTab({
  showEmptyState,
  stats,
  displayBounties,
  totalPages,
  currentPage,
  handlePrevPage,
  handleNextPage,
  expandedBountyId,
  handleToggleBounty,
  allowlists,
  allowlistLoading,
  openAllowlistModal
}) {
  const allowlistEnabled = useFlag('allowlistFeature', false);
  const refundEnabled = useFlag('refundFeature', false);
  // If user hasn't connected a wallet yet, show the empty state prompt.
  if (showEmptyState) {
    return (
      <div className="min-h-[420px] flex items-center justify-center animate-fade-in-up delay-100">
        <div className="w-full max-w-lg rounded-[36px] border border-border/60 bg-card p-10 text-center shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MoneyIcon size={32} color="currentColor" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-light text-foreground/90">Connect Wallet</h2>
            <p className="text-sm text-muted-foreground">
              Link a wallet to start funding issues and automating contributor rewards.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/link-wallet?type=funding"
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <WalletIcon size={18} />
              <span className="ml-2">Link Wallet</span>
            </Link>
            <Link
              href="/attach-bounty"
              className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
            >
              <PlusIcon size={18} />
              <span className="ml-2">Learn more about funding</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render statistics and list of active sponsored bounties.
  return (
    <>
      {/* Sponsored bounties statistics */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatBlock
          className="animate-fade-in-up delay-100"
          label="Value Locked"
          value={`$${stats?.totalValueLocked?.toLocaleString() || '0'}`}
          hint={`Across ${stats?.openBounties || 0} open bounties`}
          valueClassName="text-primary"
        />
        <StatBlock
          className="animate-fade-in-up delay-200"
          label="Total Paid"
          value={`$${stats?.totalValuePaid?.toLocaleString() || '0'}`}
          hint={`${stats?.resolvedBounties || 0} contributors`}
          valueClassName="text-primary"
        />
        <StatBlock
          className="animate-fade-in-up delay-300"
          label="Refunded"
          value={stats?.refundedBounties || 0}
          hint="Expired bounties"
          valueClassName="text-primary"
        />
      </div>

      <div className="animate-fade-in-up delay-400">
        <div>
          {/* Show empty state if there are no sponsored bounties */}
          {displayBounties.length === 0 ? (
            <div className="text-center py-[60px] px-5">
              <p className="text-sm font-light text-muted-foreground">No bounties found</p>
            </div>
          ) : (
            <>
              {/* Pagination controls if more than one page */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end mb-4 text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous bounties"
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed -mr-1"
                  >
                    <ArrowIcon direction="prev" className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium min-w-[3rem] text-center">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    aria-label="Next bounties"
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed -ml-1"
                  >
                    <ArrowIcon direction="next" className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* List of sponsored bounties */}
              <div className="space-y-3">
                {displayBounties.map((bounty) => {
                  const isExpanded = expandedBountyId === bounty.bountyId;
                  const isExpired = Number(bounty.deadline) < Math.floor(Date.now() / 1000);
                  const allowlistData = allowlists[bounty.bountyId] || [];
                  const isAllowlistLoading = !!allowlistLoading[bounty.bountyId];
                  const issueLinkParams = {
                    repoFullName: bounty.repoFullName,
                    issueNumber: bounty.issueNumber
                  };
                  const explorerLinkKey = bounty.network === 'MEZO_TESTNET' ? 'mezoTestnetTx' : 'baseSepoliaTx';

                  return (
                    <div
                      key={bounty.bountyId}
                      className="group bg-card border border-border/40 rounded-[32px] p-6 flex flex-col gap-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        {/* Repository and issue header */}
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleBounty(bounty.bountyId)}
                            aria-expanded={isExpanded}
                            className="w-full cursor-pointer text-left bg-transparent border-0 p-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-foreground text-base font-light tracking-tight opacity-90 transition-all duration-200">
                                {bounty.repoFullName}#{bounty.issueNumber}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </span>
                            </div>
                          </button>
                          <div className="mt-1 text-muted-foreground text-[13px] font-light">
                            {formatTimeLeft(bounty.deadline) === 'Expired'
                              ? 'Expired'
                              : `${formatTimeLeft(bounty.deadline)} left`}
                          </div>
                        </div>

                        {/* Reward amount and claim count */}
                        <div className="ml-auto flex flex-col items-end gap-1">
                          <div className="text-foreground text-base font-light tracking-tight text-[#0D473F]">
                            {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs font-light">
                              {(bounty.claimCount || 0).toString()} claims
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded bounty details */}
                      {isExpanded && (
                        <div className="rounded-[28px] border border-border/50 bg-muted/40 p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                            <LinkFromCatalog
                              section="github"
                              link="issue"
                              params={issueLinkParams}
                              className="text-sm font-light tracking-tight text-primary hover:text-primary/80 transition-colors"
                            >
                              View on GitHub ↗
                            </LinkFromCatalog>
                          </div>

                          {/* Bounty meta info */}
                          <div className="space-y-3 text-sm font-light text-foreground/80">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground/80">Deadline</span>
                              <span className="text-foreground">
                                {formatDeadlineDate(bounty.deadline)} {isExpired ? '(Expired)' : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground/80">Network</span>
                              <span className="text-foreground">
                                {bounty.network === 'MEZO_TESTNET' ? 'Mezo Testnet' : 'Base Sepolia'}
                              </span>
                            </div>
                            {/* Transaction link, if available */}
                            {bounty.txHash && (
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className="text-muted-foreground/80 text-sm text-left">Transaction</span>
                                <div className="text-right">
                                  <LinkFromCatalog
                                    section="explorers"
                                    link={explorerLinkKey}
                                    params={{ txHash: bounty.txHash }}
                                    className="font-mono text-xs break-all text-foreground/90 hover:text-primary inline-block text-right"
                                  >
                                    {bounty.txHash}
                                  </LinkFromCatalog>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Refund button if the bounty is open and expired */}
                          {refundEnabled && bounty.status === 'open' && isExpired && (
                            <Link
                              href={`/refund?bountyId=${bounty.bountyId}`}
                              className="inline-flex items-center justify-center rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-destructive/80 hover:border-destructive/60 hover:text-destructive transition-colors"
                            >
                              Request Refund
                            </Link>
                          )}

                          {/* Allowlist info and manage button */}
                          {allowlistEnabled && bounty.status === 'open' && (
                            <div className="rounded-2xl border border-border/60 bg-white/40 p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/80 mb-1">
                                    Allowlist
                                  </div>
                                  <div className="text-sm font-light">
                                    {isAllowlistLoading && !allowlistData.length
                                      ? 'Loading allowlist…'
                                      : allowlistData.length > 0
                                        ? `${allowlistData.length} address${allowlistData.length === 1 ? '' : 'es'}`
                                        : 'Open to anyone'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openAllowlistModal(bounty.bountyId)}
                                  className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors"
                                >
                                  Manage
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

