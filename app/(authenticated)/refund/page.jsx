'use client';

/**
 * Refund page for requesting a bounty refund.
 * Allows users to check bounty status and request a refund
 * if eligible (expired and unresolved, by sponsor).
 */
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertIcon } from '@/shared/components/Icons';
import StatusNotice from '@/shared/components/StatusNotice';
import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useEligibleRefundBounties,
  useBountyVerification,
  useRefundTransaction,
  EligibleBountiesList,
  BountyDetails
} from '@/features/refund';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { useFlag } from '@/shared/providers/FlagProvider';

export default function Refund() {
  const refundEnabled = useFlag('refundFeature', false);

  // Hide refund page if feature flag is disabled
  if (!refundEnabled) {
    return (
      <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] text-center">
          <h1 className="text-4xl font-light text-foreground/90 mb-4">Refund Feature Unavailable</h1>
          <p className="text-sm text-muted-foreground">
            The refund feature is currently disabled.
          </p>
        </div>
      </div>
    );
  }
  const [refunded, setRefunded] = useState(false);

  // Fetch eligible bounties
  const { eligibleBounties, loadingBounties, fetchEligibleBounties } = useEligibleRefundBounties();

  // Verify bounties
  const {
    bountyInfo,
    currentBounty,
    selectedBounty,
    status,
    verifyBounty,
    clearBountyState,
    showStatus
  } = useBountyVerification();

  // Get wallet info
  const { address, isConnected } = useAccount();
  const { currentNetwork: network } = useNetwork();

  // Handle successful refund
  const handleRefundSuccess = async () => {
    setRefunded(true);
    clearBountyState();
    await fetchEligibleBounties();
  };

  // Execute refund transaction
  const { requestRefund } = useRefundTransaction({
    currentBounty,
    selectedBounty,
    onSuccess: handleRefundSuccess,
    showStatus
  });

  // Handle bounty selection
  const handleSelectBounty = async (bounty) => {
    try {
      await verifyBounty(bounty);
      setRefunded(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Sponsor display helper
  const sponsorDisplay = useMemo(() => {
    if (!bountyInfo?.sponsor) return '';
    return `${bountyInfo.sponsor.slice(0, 6)}...${bountyInfo.sponsor.slice(-4)}`;
  }, [bountyInfo]);

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
        {!isConnected ? (
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
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-foreground mt-2">
                <span>Network</span>
                <span className="font-medium">
                  {network?.name} ({network?.token?.symbol})
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

            {/* Show eligible bounties list */}
            <EligibleBountiesList
              bounties={eligibleBounties}
              selectedBounty={selectedBounty}
              onSelectBounty={handleSelectBounty}
              loading={loadingBounties}
            />

            {/* Show checked bounty details if available */}
            <BountyDetails
              bountyInfo={bountyInfo}
              network={network}
              sponsorDisplay={sponsorDisplay}
            />

            {/* Request refund button, if eligible */}
            {currentBounty && (
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
