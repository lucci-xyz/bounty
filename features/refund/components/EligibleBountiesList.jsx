'use client';

import { EligibleBountyCard } from './EligibleBountyCard';

/**
 * List component for displaying eligible refund bounties.
 * 
 * @param {Object} props
 * @param {Array} props.bounties - Array of eligible bounties
 * @param {Object} props.selectedBounty - Currently selected bounty
 * @param {Function} props.onSelectBounty - Callback when a bounty is selected
 * @param {boolean} props.loading - Whether bounties are loading
 */
export function EligibleBountiesList({ bounties, selectedBounty, onSelectBounty, loading }) {
  if (loading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Loading eligible bounties...
      </div>
    );
  }

  if (bounties.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <p className="mb-2">No eligible bounties found for refund.</p>
        <p className="text-xs">Bounties must be expired, open, and sponsored by your connected wallet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
        Select Bounty to Refund
      </label>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {bounties.map((bounty) => (
          <EligibleBountyCard
            key={bounty.bountyId}
            bounty={bounty}
            isSelected={selectedBounty?.bountyId === bounty.bountyId}
            onSelect={onSelectBounty}
          />
        ))}
      </div>
    </div>
  );
}

