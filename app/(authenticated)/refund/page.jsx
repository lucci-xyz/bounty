'use client';

/**
 * Refund page for requesting a bounty refund.
 * Allows users to check bounty status and request a refund
 * if eligible (expired and unresolved, by sponsor).
 */
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertIcon } from '@/shared/components/Icons';
import StatusNotice from '@/shared/components/StatusNotice';
import { useRefundFlow } from '@/shared/hooks/useRefundFlow';

export default function Refund() {
  /**
   * useRefundFlow manages refund logic and state:
   * - bountyId: The entered bounty ID
   * - bountyInfo: Bounty details returned from status check
   * - status: Status object for operation/result feedback
   * - refunded: Whether the refund was already processed
   * - wallet: Current connected wallet information
   * - checkBounty: Action to check a bounty by ID
   * - requestRefund: Action to request refund on checked bounty
   * - hasCurrentBounty: True if a valid, checked bounty present
   * - sponsorDisplay: Sponsor short display value
   */
  const {
    inputs: { bountyId, setBountyId },
    info: bountyInfo,
    status,
    refunded,
    wallet,
    actions: { checkBounty, requestRefund },
    hasCurrentBounty,
    derived: { sponsorDisplay }
  } = useRefundFlow();

  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
        {/* Page title and purpose */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light text-foreground/90">Refund Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Request funds back on expired bounties that were never resolved.
          </p>
        </div>

        {/* Refund eligibility information */}
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex gap-3">
          <AlertIcon size={20} color="#B87D00" />
          <div>
            <p className="font-medium text-foreground">Eligibility</p>
            <p className="text-sm text-amber-900/80 mt-1">
              Refunds are only available once the deadline has passed without a resolution, and only by the original sponsor.
            </p>
          </div>
        </div>

        {/* Wallet connection and refund flow */}
        {!wallet.isConnected ? (
          // Prompt to connect wallet
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button
                onClick={() => openConnectModal?.()}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Connect Wallet
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <div className="space-y-5">
            {/* Display connected wallet details */}
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
              <div className="flex items-center justify-between text-foreground">
                <span>Connected</span>
                <span className="font-medium">
                  {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-foreground mt-2">
                <span>Network</span>
                <span className="font-medium">
                  {wallet.network?.name} ({wallet.network?.token.symbol})
                </span>
              </div>
            </div>

            {/* Wallet/account/network actions */}
            <ConnectButton.Custom>
              {({ openAccountModal, openChainModal }) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    onClick={() => openAccountModal?.()}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
                  >
                    Change Wallet
                  </button>
                  <button
                    onClick={() => openChainModal?.()}
                    className="inline-flex items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
                  >
                    Switch Network
                  </button>
                </div>
              )}
            </ConnectButton.Custom>

            {/* Enter and check bounty ID */}
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                Bounty ID
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={bountyId}
                onChange={(e) => setBountyId(e.target.value)}
                className="w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <button
                onClick={checkBounty}
                className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary"
              >
                Check Bounty Status
              </button>
            </div>

            {/* Show checked bounty details if available */}
            {bountyInfo && (
              <div className="rounded-3xl border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between text-foreground">
                  <span>Amount</span>
                  <span className="font-medium">
                    {bountyInfo.amount} {wallet.network?.token.symbol}
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
            )}

            {/* Request refund button, if eligible */}
            {hasCurrentBounty && (
              <button
                onClick={requestRefund}
                disabled={refunded}
                className="inline-flex w-full items-center justify-center rounded-full bg-destructive px-6 py-3 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refunded ? 'Refunded' : 'Request Refund'}
              </button>
            )}
          </div>
        )}

        {/* Shows status messages from refund flow */}
        <StatusNotice status={status} />
      </div>
    </div>
  );
}
