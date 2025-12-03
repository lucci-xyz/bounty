'use client';

import { useState, useEffect } from 'react';
import { formatAmount, formatTimeRemaining, formatStarCount } from '@/lib';
import { LinkFromCatalog } from '@/ui/components/LinkFromCatalog';

/**
 * BountyCard component
 *
 * Displays information about a bounty, including its GitHub issue,
 * status, amount, language, labels, and optionally a "Manage" button.
 *
 * @param {Object} props
 * @param {Object} props.bounty - The bounty data to display
 * @param {boolean} [props.showActions=false] - Show action buttons (like "Manage")
 * @param {Function} [props.onManage] - Function to call when managing the bounty
 */
export default function BountyCard({ bounty, showActions = false, onManage }) {
  const explorerLinkKey = bounty?.network === 'MEZO_TESTNET' ? 'mezoTestnetTx' : 'baseSepoliaTx';
  // Responsive handling (for future extensibility)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bounty-card">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Issue Title and Status */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <LinkFromCatalog
              section="github"
              link="issue"
              params={{ repoFullName: bounty.repoFullName, issueNumber: bounty.issueNumber }}
              className="text-base md:text-lg text-primary hover:underline font-medium break-words"
            >
              {bounty.repoFullName}#{bounty.issueNumber}
            </LinkFromCatalog>
            {bounty.repoStars && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                ★ {formatStarCount(bounty.repoStars)}
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
              bounty.status === 'open' ? 'bg-primary/10 text-primary' :
              bounty.status === 'resolved' ? 'bg-green-500/10 text-green-600' :
              bounty.status === 'refunded' ? 'bg-yellow-500/10 text-yellow-600' :
              'bg-secondary text-muted-foreground'
            }`}>
              {bounty.status}
            </span>
          </div>

          {/* Issue Description */}
          {bounty.issueDescription && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">
              {bounty.issueDescription}
            </p>
          )}

          {/* Language and Labels */}
          <div className="flex gap-2 flex-wrap text-xs">
            {bounty.language && (
              <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
                {bounty.language}
              </span>
            )}
            {bounty.labels && bounty.labels.length > 0 && bounty.labels.map((label, idx) => (
              <span
                key={idx}
                className="bounty-tag"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Amount and Deadline, Link to transaction if available */}
        {bounty.txHash ? (
          <LinkFromCatalog
            section="explorers"
            link={explorerLinkKey}
            params={{ txHash: bounty.txHash }}
            className="px-4 py-3 md:px-5 md:py-3.5 bg-accent/10 hover:bg-accent/20 rounded-lg text-center min-w-fit md:min-w-[140px] no-underline flex flex-col items-center transition-all"
          >
            <div className="text-lg md:text-xl font-medium text-primary mb-1">
              {formatAmount(bounty.amount, bounty.tokenSymbol, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: true
              })}{' '}
              {bounty.tokenSymbol}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {formatTimeRemaining(bounty.deadline)} left
              <span>↗</span>
            </div>
          </LinkFromCatalog>
        ) : (
          <div className="px-4 py-3 md:px-5 md:py-3.5 bg-accent/10 rounded-lg text-center min-w-fit md:min-w-[140px] flex flex-col items-center">
            <div className="text-lg md:text-xl font-medium text-primary mb-1">
              {formatAmount(bounty.amount, bounty.tokenSymbol, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                useGrouping: true
              })}{' '}
              {bounty.tokenSymbol}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTimeRemaining(bounty.deadline)} left
            </div>
          </div>
        )}
      </div>

      {/* Manage Button (if actions are shown) */}
      {showActions && onManage && (
        <div className="pt-4 border-t border-border flex gap-2">
          <button
            onClick={() => onManage(bounty.bountyId)}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-normal bg-secondary text-foreground hover:bg-muted transition-colors"
          >
            Manage
          </button>
        </div>
      )}
    </div>
  );
}
