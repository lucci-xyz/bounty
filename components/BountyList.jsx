'use client';

import { formatAmount, formatDeadline, formatStars } from '@/lib/formatters';
import { getBlockExplorerUrl } from '@/lib/utils';

/**
 * Displays a list of bounties with responsive card layout
 */
export default function BountyList({ bounties, isMobile }) {
  if (bounties.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 relative z-[1]">
      {bounties.map((bounty, index) => (
        <div 
          key={bounty.bountyId} 
          className={`card bounty-card animate-fade-in-up delay-${Math.min(index * 100, 500)}`}
        >
          <div className="bounty-card-content">
            <div className="bounty-card-main">
              <div className="bounty-card-header">
                <a 
                  href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bounty-card-title"
                >
                  {bounty.repoFullName}#{bounty.issueNumber}
                </a>
                {bounty.repoStars && (
                  <span className="bounty-card-stars">
                    ★ {formatStars(bounty.repoStars)}
                  </span>
                )}
              </div>
              
              {bounty.issueDescription && (
                <p className="bounty-card-description">
                  {bounty.issueDescription}
                </p>
              )}

              <div className="bounty-card-tags">
                {bounty.language && (
                  <span className="badge badge-primary">
                    {bounty.language}
                  </span>
                )}
                {bounty.labels && bounty.labels.length > 0 && bounty.labels.map((label, idx) => (
                  <span key={idx} className="badge badge-neutral">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {bounty.txHash ? (
              <a
                href={getBlockExplorerUrl(bounty.network, bounty.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="bounty-card-amount interactive"
              >
                <div className="bounty-card-amount-value">
                  {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                </div>
                <div className="bounty-card-deadline">
                  {formatDeadline(bounty.deadline)} left
                  <span>↗</span>
                </div>
              </a>
            ) : (
              <div className="bounty-card-amount">
                <div className="bounty-card-amount-value">
                  {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                </div>
                <div className="bounty-card-deadline">
                  {formatDeadline(bounty.deadline)} left
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

