'use client';

import Link from 'next/link';
import { useBountyFeed } from '@/ui/hooks/useBountyFeed';
import { formatAmount, formatTimeLeft, capitalizeFirst } from '@/lib';
import { LinkFromCatalog } from '@/ui/components/LinkFromCatalog';

/**
 * App home page listing all available bounties.
 * Includes search and handles loading/error states.
 */
export default function HomePage() {
  const {
    filteredBounties,
    hasAnyBounties,
    searchQuery,
    setSearchQuery,
    clearSearch,
    loading,
    error
  } = useBountyFeed();

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-instrument-serif text-3xl md:text-4xl text-foreground mb-2">
            Open Bounties
          </h1>
          <p className="text-sm text-muted-foreground">
            Contributing to open source, rewarded in crypto
          </p>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            <span className="text-sm">Loading bounties...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error block if fetch failed
  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-instrument-serif text-3xl md:text-4xl text-foreground mb-2">
            Open Bounties
          </h1>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-destructive text-sm mb-4">Unable to load bounties</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full border border-destructive/30 text-sm text-destructive hover:bg-destructive/5 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-instrument-serif text-3xl md:text-4xl text-foreground mb-2">
          Open Bounties
        </h1>
        <p className="text-sm text-muted-foreground">
          Contributing to open source, rewarded in crypto
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <svg 
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search bounties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full !h-10 !pl-10 !pr-4 !py-0 !mb-0 !rounded-full !border !border-border !bg-card !text-sm text-foreground placeholder:text-muted-foreground focus:!outline-none focus:!ring-2 focus:!ring-primary/20 focus:!border-primary transition-all"
          />
        </div>
        
        <Link
          href="/app/attach-bounty"
          className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Bounty
        </Link>
      </div>

      {/* Bounties listing */}
      {filteredBounties.length === 0 ? (
        <div className="text-center py-16 px-6 bg-card border border-border rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-muted-foreground mb-4">
            {hasAnyBounties ? 'No bounties match your search.' : 'No open bounties at the moment.'}
          </p>
          {hasAnyBounties ? (
            <button
              onClick={clearSearch}
              className="px-5 py-2.5 rounded-full text-sm font-medium border border-border hover:bg-secondary transition-colors"
            >
              Clear Search
            </button>
          ) : (
            <Link
              href="/app/attach-bounty"
              className="inline-flex px-5 py-2.5 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Create the first bounty
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBounties.map((bounty) => {
            const amountNumber = formatAmount(bounty.amount, bounty.tokenSymbol, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
              useGrouping: true
            });
            const rawTimeRemaining = formatTimeLeft(bounty.deadline);
            const timeDisplay =
              !rawTimeRemaining || rawTimeRemaining === '-'
                ? 'No deadline'
                : rawTimeRemaining === '< 1h'
                  ? '< 1 hour'
                  : rawTimeRemaining;

            return (
              <div
                key={bounty.bountyId}
                className="group p-6 bg-card/80 backdrop-blur-sm border border-border rounded-2xl transition-all duration-300 hover:shadow-lg hover:border-primary/30"
              >
                {/* Top row: repo + amount */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p className="text-sm text-muted-foreground font-mono">{bounty.repoFullName}</p>
                  <div className="text-right flex-shrink-0 flex items-baseline gap-1.5">
                    <span className="font-instrument-serif text-2xl font-normal italic text-foreground">{amountNumber}</span>
                    <span className="font-instrument-serif text-xs text-muted-foreground uppercase">{bounty.tokenSymbol}</span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-foreground font-medium text-lg leading-snug line-clamp-2 mb-6">
                  {capitalizeFirst(bounty.issueTitle || bounty.issueDescription || 'Bounty')}
                </h3>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeDisplay}
                  </div>
                  <LinkFromCatalog
                    section="github"
                    link="issue"
                    params={{ repoFullName: bounty.repoFullName, issueNumber: bounty.issueNumber }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group/link"
                  >
                    View issue
                    <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                  </LinkFromCatalog>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
