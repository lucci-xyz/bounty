'use client';

import Link from 'next/link';
import { useBountyFeed } from '@/features/home/hooks/useBountyFeed';
import { formatAmount, formatTimeLeft } from '@/shared/lib';
import { LinkFromCatalog } from '@/shared/components/LinkFromCatalog';

/**
 * Home page listing all available bounties.
 * Includes search and handles loading/error states.
 */
export default function Home() {
  // Get bounty feed data and methods
  const {
    filteredBounties,   // Bounties after search filtering
    hasAnyBounties,     // Whether there is at least one bounty
    searchQuery,        // Current search string
    setSearchQuery,     // Function to update the search string
    clearSearch,        // Resets search
    loading,            // Loading state
    error               // Error message if any
  } = useBountyFeed();

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-medium tracking-tight mb-2">Bounties</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show error block if fetch failed
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-5xl font-medium tracking-tight mb-2">Bounties</h1>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
          <p className="text-destructive text-sm">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="mb-3 text-[2.2rem] font-light tracking-[-0.02em] text-foreground/90">
          Bounties
        </h1>
        <p className="text-base text-muted-foreground">
          Contributing to open source, rewarded in crypto
        </p>
      </div>

      {/* Search input */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex flex-1 w-full max-w-[520px] min-w-[320px] items-center">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-border/60 bg-white px-6 text-sm text-muted-foreground placeholder:text-muted-foreground/70 shadow-[0_6px_18px_rgba(15,23,42,0.08)] outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Bounties listing */}
      {filteredBounties.length === 0 ? (
        // No bounties found
        <div className="text-center py-16 px-6 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground mb-6">
            {hasAnyBounties ? 'No bounties match your filters.' : 'No open bounties at the moment.'}
          </p>
          {hasAnyBounties && (
            <button
              onClick={clearSearch}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        // Render grid of bounties
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
          {filteredBounties.map((bounty) => {
            // Format bounty amount and deadline countdown
            const amountDisplay = formatAmount(bounty.amount, bounty.tokenSymbol, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
              useGrouping: true
            });
            const rawTimeRemaining = formatTimeLeft(bounty.deadline);
            const timeDisplay =
              !rawTimeRemaining || rawTimeRemaining === '-'
                ? 'Unknown'
                : rawTimeRemaining === '< 1h'
                  ? 'Less than 1h'
                  : rawTimeRemaining;

            return (
              <div
                key={bounty.bountyId}
                className="bounty-card group flex flex-col gap-6"
              >
                {/* Bounty info */}
                <div className="flex items-start justify-between gap-8">
                  <div className="space-y-3 min-w-0">
                    <div>
                      <h3 className="text-[1.2rem] font-light leading-snug text-foreground/90">
                        {bounty.issueTitle || bounty.issueDescription || 'Bounty'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {bounty.repoFullName}
                      </p>
                    </div>
                  </div>
                  {/* Bounty amount */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-light text-[#0D473F]/90 dark:text-primary">
                      {amountDisplay}
                    </div>
                    <div className="text-xs text-muted-foreground tracking-[0.4em] uppercase">
                      {bounty.tokenSymbol}
                    </div>
                  </div>
                </div>

                {/* Deadline/time left */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary"
                  >
                    {timeDisplay} left
                  </span>
                </div>

                {/* Link to GitHub issue */}
                <LinkFromCatalog
                  section="github"
                  link="issue"
                  params={{ repoFullName: bounty.repoFullName, issueNumber: bounty.issueNumber }}
                  className="mt-auto inline-flex w-full items-center justify-center rounded-full border border-border/70 bg-muted/80 px-6 py-3 text-sm font-medium text-foreground/90 transition-all hover:bg-gray-100"
                >
                  View Issue
                </LinkFromCatalog>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
