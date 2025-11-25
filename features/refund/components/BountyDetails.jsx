'use client';

/**
 * Component for displaying verified bounty details.
 * 
 * @param {Object} props
 * @param {Object} props.bountyInfo - Bounty information object
 * @param {Object} props.network - Network object with token info
 * @param {string} props.sponsorDisplay - Formatted sponsor address
 */
export function BountyDetails({ bountyInfo, network, sponsorDisplay, linkedWallet, refundMeta }) {
  if (!bountyInfo) {
    return null;
  }
  const fundingWallet = refundMeta?.fundingWallet || bountyInfo.sponsor;
  const expectedWallet = refundMeta?.expectedWallet || linkedWallet;
  const canSelfRefund = refundMeta?.canSelfRefund ?? bountyInfo?.canSelfRefund;

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
      <div className="flex items-center justify-between text-foreground">
        <span>Funding wallet</span>
        <code className="text-xs">{fundingWallet ? `${fundingWallet.slice(0, 6)}...${fundingWallet.slice(-4)}` : '—'}</code>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span>Linked wallet</span>
        <code className="text-xs">
          {expectedWallet ? `${expectedWallet.slice(0, 6)}...${expectedWallet.slice(-4)}` : '—'}
        </code>
      </div>
      <div className="flex items-center justify-between text-foreground">
        <span>Self-refund</span>
        <span className={`font-medium ${canSelfRefund ? 'text-green-600' : 'text-amber-600'}`}>
          {canSelfRefund ? 'Available' : 'Connect funding wallet'}
        </span>
      </div>
    </div>
  );
}
