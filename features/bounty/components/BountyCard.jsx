'use client';

import { useState, useEffect } from 'react';

export default function BountyCard({ bounty, showActions = false, onManage }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'USDC' || tokenSymbol === 'MUSD' ? (tokenSymbol === 'USDC' ? 6 : 18) : 18;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDeadline(deadline) {
    const date = new Date(Number(deadline) * 1000);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  }

  function formatStars(stars) {
    if (!stars && stars !== 0) {
      return '0';
    }
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'var(--color-primary)';
      case 'resolved':
        return 'var(--color-success)';
      case 'refunded':
        return 'var(--color-warning)';
      case 'canceled':
        return 'var(--color-text-secondary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  return (
    <div className="bounty-card"
    >
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <a 
              href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base md:text-lg text-primary hover:underline font-medium break-words"
            >
              {bounty.repoFullName}#{bounty.issueNumber}
            </a>
            {bounty.repoStars && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                ★ {formatStars(bounty.repoStars)}
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
          
          {bounty.issueDescription && (
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">
              {bounty.issueDescription}
            </p>
          )}

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
        
        {bounty.txHash ? (
          <a
            href={`https://sepolia.basescan.org/tx/${bounty.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 md:px-5 md:py-3.5 bg-accent/10 hover:bg-accent/20 rounded-lg text-center min-w-fit md:min-w-[140px] no-underline flex flex-col items-center transition-all"
          >
            <div className="text-lg md:text-xl font-medium text-primary mb-1">
              {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {formatDeadline(bounty.deadline)} left
              <span>↗</span>
            </div>
          </a>
        ) : (
          <div className="px-4 py-3 md:px-5 md:py-3.5 bg-accent/10 rounded-lg text-center min-w-fit md:min-w-[140px] flex flex-col items-center">
            <div className="text-lg md:text-xl font-medium text-primary mb-1">
              {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDeadline(bounty.deadline)} left
            </div>
          </div>
        )}
      </div>
      
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

