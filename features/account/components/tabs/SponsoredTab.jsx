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
 * @param {Array} props.sponsoredBounties - Full array of bounty objects to display.
 * @param {string|null} props.expandedBountyId - The currently expanded bounty's id or null.
 * @param {function} props.handleToggleBounty - Handler for expanding/collapsing a bounty card.
 * @param {Object} props.allowlists - Allowlist addresses by bounty id.
 * @param {Object} props.allowlistLoading - Loading state for each bounty's allowlist.
 * @param {function} props.openAllowlistModal - Handler to open the manage allowlist modal.
 */
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { ArrowIcon, MoneyIcon, PlusIcon, WalletIcon } from '@shared/components/Icons';
import { StatBlock } from '@/features/account/components/StatBlock';
import { formatAmount, formatDeadlineDate, formatTimeLeft } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';
import { useFlag } from '@/shared/providers/FlagProvider';

const ITEMS_PER_PAGE = 4;
const CLOSED_BOUNTY_STATUSES = new Set(['closed', 'paid', 'resolved', 'refunded']);

const deriveLifecycleState = (bounty, nowSeconds = Math.floor(Date.now() / 1000)) => {
  if (bounty?.lifecycle?.state) {
    return bounty.lifecycle.state;
  }

  if (CLOSED_BOUNTY_STATUSES.has(bounty?.status)) {
    return 'closed';
  }

  const deadlineSeconds = Number(bounty?.deadline);
  if (Number.isFinite(deadlineSeconds) && deadlineSeconds <= nowSeconds) {
    return 'expired';
  }

  return 'open';
};

const getLifecycleLabel = (bounty, state) => {
  if (bounty?.lifecycle?.label) {
    return bounty.lifecycle.label;
  }
  if (state === 'closed') return 'Closed';
  if (state === 'expired') return 'Expired';
  return '';
};

const getCountdownLabel = (bounty, state) => {
  if (state !== 'open') return null;
  const label = formatTimeLeft(bounty.deadline);
  if (!label || label === '-' || label === 'Expired') return null;
  return label;
};

export function SponsoredTab({
  showEmptyState,
  stats,
  sponsoredBounties = [],
  expandedBountyId,
  handleToggleBounty,
  allowlists,
  allowlistLoading,
  openAllowlistModal
}) {
  const allowlistEnabled = useFlag('allowlistFeature', false);
  const refundEnabled = useFlag('refundFeature', false);

  // Local state for toolbar filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [sortOption, setSortOption] = useState('deadline-asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Client-side filtering and sorting of the sponsor's bounties
  const filteredBounties = useMemo(() => {
    if (!sponsoredBounties) return [];

    let result = [...sponsoredBounties];

    // 1. Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.repoFullName && b.repoFullName.toLowerCase().includes(query)) ||
        (b.issueNumber && b.issueNumber.toString().includes(query))
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      const now = Math.floor(Date.now() / 1000);
      result = result.filter((bounty) => {
        const lifecycleState = deriveLifecycleState(bounty, now);
        if (statusFilter === 'expired') return lifecycleState === 'expired';
        if (statusFilter === 'open') return lifecycleState === 'open';
        if (statusFilter === 'closed') return lifecycleState === 'closed';
        return true;
      });
    }

    // 3. Network Filter
    if (networkFilter !== 'all') {
      result = result.filter(b => b.network === networkFilter);
    }

    // 4. Sort
    result.sort((a, b) => {
      const [key, dir] = sortOption.split('-');
      let valA, valB;

      if (key === 'deadline') {
        valA = Number(a.deadline);
        valB = Number(b.deadline);
      } else if (key === 'amount') {
        valA = Number(a.amount);
        valB = Number(b.amount);
      }

      if (dir === 'asc') return valA - valB;
      return valB - valA;
    });

    return result;
  }, [sponsoredBounties, searchQuery, statusFilter, networkFilter, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filteredBounties.length / ITEMS_PER_PAGE));
  const paginatedBounties = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBounties.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBounties, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, networkFilter, sponsoredBounties.length]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

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
          {/* Filters and Pagination Toolbar */}
          {sponsoredBounties.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 mx-1 p-1">
              {/* Left side: Filters */}
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                {/* Search */}
                <div className="relative flex-grow min-w-[200px] max-w-xs">
                  <input
                    type="text"
                    placeholder="Search bounties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full !h-9 !px-4 !py-1 !mb-0 !rounded-[32px] border border-border/60 bg-card !text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all shadow-sm"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="!h-9 !pl-4 !pr-10 !py-1 !mb-0 !rounded-[32px] border border-border/60 bg-card !text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer appearance-none shadow-sm hover:border-primary/40 transition-colors"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.2em 1.2em'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed / Paid</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                {/* Network Filter */}
                <div className="relative">
                  <select
                    value={networkFilter}
                    onChange={(e) => setNetworkFilter(e.target.value)}
                    className="!h-9 !pl-4 !pr-10 !py-1 !mb-0 !rounded-[32px] border border-border/60 bg-card !text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer appearance-none shadow-sm hover:border-primary/40 transition-colors"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.2em 1.2em'
                    }}
                  >
                    <option value="all">All Networks</option>
                    <option value="MEZO_TESTNET">Mezo Testnet</option>
                    <option value="BASE_SEPOLIA">Base Sepolia</option>
                  </select>
                </div>

                {/* Sort Control */}
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="!h-9 !pl-4 !pr-10 !py-1 !mb-0 !rounded-[32px] border border-border/60 bg-card !text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer appearance-none shadow-sm hover:border-primary/40 transition-colors"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.2em 1.2em'
                    }}
                  >
                    <option value="deadline-asc">Deadline (Earliest)</option>
                    <option value="deadline-desc">Deadline (Latest)</option>
                    <option value="amount-asc">Amount (Low to High)</option>
                    <option value="amount-desc">Amount (High to Low)</option>
                  </select>
                </div>
              </div>

              {/* Right side: Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center text-sm text-muted-foreground shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="Previous bounties"
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-border/40"
                  >
                    <ArrowIcon direction="prev" className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium min-w-[3rem] text-center tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    aria-label="Next bounties"
                    className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-border/40"
                  >
                    <ArrowIcon direction="next" className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Show empty state if there are no bounties matching filters */}
          {paginatedBounties.length === 0 ? (
            <div className="text-center py-[60px] px-5">
              <p className="text-sm font-light text-muted-foreground">
                {sponsoredBounties.length === 0 ? 'No bounties found' : 'No bounties match your filters'}
              </p>
            </div>
          ) : (
            <>
              {/* List of sponsored bounties */}
              <div className="space-y-3">
                {paginatedBounties.map((bounty) => {
                  const isExpanded = expandedBountyId === bounty.bountyId;
                  const lifecycleState = deriveLifecycleState(bounty);
                  const lifecycleLabel = getLifecycleLabel(bounty, lifecycleState);
                  const countdownLabel = getCountdownLabel(bounty, lifecycleState);
                  const timelineLabel = countdownLabel ? `${countdownLabel} left` : lifecycleLabel || 'Open';
                  const isClosed = lifecycleState === 'closed';
                  const isExpired = lifecycleState === 'expired';
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
                            {timelineLabel}
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
                                {formatDeadlineDate(bounty.deadline)}{' '}
                                {isClosed ? '(Closed)' : isExpired ? '(Expired)' : ''}
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

