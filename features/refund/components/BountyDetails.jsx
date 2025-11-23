'use client';

/**
 * Component for displaying verified bounty details.
 * 
 * @param {Object} props
 * @param {Object} props.bountyInfo - Bounty information object
 * @param {Object} props.network - Network object with token info
 * @param {string} props.sponsorDisplay - Formatted sponsor address
 */
export function BountyDetails({ bountyInfo, network, sponsorDisplay }) {
  if (!bountyInfo) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground space-y-2">
      <div className="flex items-center justify-between text-foreground">
        <span>Amount</span>
        <span className="font-medium">
          {bountyInfo.amount} {network?.token?.symbol}
        </span>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span>Deadline</span>
        <span className="font-medium">{bountyInfo.deadline}</span>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span>Status</span>
        <span className="font-medium">{bountyInfo.status}</span>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span>Sponsor</span>
        <code className="text-xs">{sponsorDisplay}</code>
      </div>
    </div>
  );
}

