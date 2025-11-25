'use client';

import { formatAmount } from '@/shared/lib/format';

/**
 * Card component for displaying an eligible refund bounty.
 * 
 * @param {Object} props
 * @param {Object} props.bounty - The bounty object
 * @param {boolean} props.isSelected - Whether this bounty is selected
 * @param {Function} props.onSelect - Callback when bounty is selected
 */
export function EligibleBountyCard({ bounty, isSelected, onSelect }) {
  const amount = formatAmount(bounty.amount, bounty.tokenSymbol, { maximumFractionDigits: 4 });
  const deadline = new Date(Number(bounty.deadline) * 1000);
  const deadlineStr = deadline.toLocaleDateString();

  return (
    <button
      type="button"
      onClick={() => onSelect(bounty)}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border/60 bg-muted/30 hover:border-primary/60 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground mb-1">
            {bounty.repoFullName}#{bounty.issueNumber}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground/80">
                {amount} {bounty.tokenSymbol}
              </span>
            </div>
            <div>Expired: {deadlineStr}</div>
            <div className="font-mono text-[10px] opacity-70">
              {bounty.bountyId.slice(0, 10)}...{bounty.bountyId.slice(-8)}
            </div>
          </div>
        </div>
        {isSelected && (
          <div className="text-primary text-sm font-medium">✓ Selected</div>
        )}
      </div>
    </button>
  );
}
