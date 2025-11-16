'use client';

import { formatAmount, formatDeadline, formatStars, getStatusColor } from '@/lib/formatters';

/**
 * Card component for displaying individual bounty information
 * @param {Object} bounty - Bounty data object
 * @param {boolean} showActions - Whether to show action buttons
 * @param {Function} onManage - Callback for manage button click
 */
export default function BountyCard({ bounty, showActions = false, onManage }) {
  const getBadgeClass = (status) => {
    const colorMap = {
      open: 'badge-success',
      pending: 'badge-warning',
      resolved: 'badge-primary',
      refunded: 'badge-neutral'
    };
    return `badge ${colorMap[status] || 'badge-neutral'}`;
  };

  return (
    <div className="card bounty-card">
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
            <span className={getBadgeClass(bounty.status)}>
              {bounty.status}
            </span>
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
            href={`https://sepolia.basescan.org/tx/${bounty.txHash}`}
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
      
      {showActions && onManage && (
        <div className="bounty-card-actions">
          <button onClick={() => onManage(bounty.bountyId)} className="btn btn-secondary">
            Manage
          </button>
        </div>
      )}
    </div>
  );
}
