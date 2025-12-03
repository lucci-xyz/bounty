'use client';

import { formatAmount } from '@/lib/format';

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
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-foreground">
            {bounty.repoFullName}#{bounty.issueNumber}
          </div>
          <div className="text-sm font-medium text-primary text-right">
            {amount} {bounty.tokenSymbol}
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Expired: {deadlineStr}</div>
          <div className="font-mono text-[10px] opacity-70">
            {bounty.bountyId.slice(0, 10)}...{bounty.bountyId.slice(-8)}
          </div>
        </div>
        {isSelected && (
          <div className="text-primary text-sm font-medium">✓ Selected</div>
        )}
      </div>
    </button>
  );
}
