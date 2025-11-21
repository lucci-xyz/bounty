'use client';

import { useEffect, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ethers } from 'ethers';
import { AlertIcon } from '@/shared/components/Icons';
import { useNetwork } from '@/shared/components/NetworkProvider';
import { useErrorModal } from '@/shared/components/ErrorModalProvider';
import StatusNotice from '@/shared/components/StatusNotice';
import { ABIS } from '@/config/chain-registry';

export default function Refund() {
  const [bountyId, setBountyId] = useState('');
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [refunded, setRefunded] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { showError } = useErrorModal();

  const { currentNetwork: network, registry, networkGroup, defaultAlias, selectedAlias, setSelectedAlias } = useNetwork();

  useEffect(() => {
    if (!registry || !networkGroup) {
      return;
    }
    if (!selectedAlias && defaultAlias) {
      setSelectedAlias(defaultAlias);
      return;
    }
    if (selectedAlias && registry[selectedAlias]?.group !== networkGroup) {
      setSelectedAlias(defaultAlias);
    }
  }, [defaultAlias, networkGroup, registry, selectedAlias, setSelectedAlias]);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const checkBounty = async () => {
    try {
      if (!network) {
        throw new Error('Network not initialized. Please try again.');
      }
      if (!bountyId || !bountyId.startsWith('0x')) {
        throw new Error('Please enter a valid bounty ID (0x...)');
      }

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // Check and switch network if needed
      if (chain?.id !== network.chainId) {
        showStatus(`Switching to ${network.name}...`, 'loading');
        await switchChain({ chainId: network.chainId });
      }

      showStatus('Checking bounty...', 'loading');

      // Create provider for reading contract
      const provider = new ethers.BrowserProvider(walletClient);
      const escrow = new ethers.Contract(network.contracts.escrow, ABIS.escrow, provider);
      const bounty = await escrow.getBounty(bountyId);

      const amount = ethers.formatUnits(bounty.amount, network.token.decimals);
      const deadline = new Date(Number(bounty.deadline) * 1000);
      const statusText = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'][Number(bounty.status)];
      const now = new Date();

      setBountyInfo({
        amount,
        deadline: deadline.toISOString().split('T')[0],
        status: statusText,
        sponsor: bounty.sponsor
      });

      if (bounty.sponsor.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Only the sponsor can request a refund');
      }

      if (statusText !== 'Open') {
        throw new Error(`Bounty is not open (status: ${statusText})`);
      }

      if (deadline > now) {
        throw new Error('Deadline has not passed yet');
      }

      setCurrentBounty({ bountyId, ...bounty });
      showStatus('✓ Eligible for refund', 'success');
    } catch (error) {
      console.error(error);
      showError({
        title: 'Bounty Check Failed',
        message: error.message || 'An error occurred while checking the bounty',
      });
      setBountyInfo(null);
      setCurrentBounty(null);
    }
  };

  const requestRefund = async () => {
    try {
      if (!network) {
        throw new Error('Network not initialized. Please try again.');
      }
      if (!currentBounty) {
        throw new Error('Please check bounty status first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      showStatus('Requesting refund...', 'loading');

      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(network.contracts.escrow, ABIS.escrow, signer);
      
      // Networks without EIP-1559: use legacy transactions
      let txOverrides = {};
      if (!network.supports1559) {
        const feeData = await provider.getFeeData();
        txOverrides = {
          type: 0, // Legacy transaction
          gasPrice: feeData.gasPrice
        };
        console.log('Using legacy transaction with gasPrice:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
      }
      
      const tx = await escrow.refundExpired(currentBounty.bountyId, txOverrides);

      showStatus('Waiting for confirmation...', 'loading');
      const receipt = await tx.wait();

      showStatus(`✅ Refund successful! TX: ${receipt.hash}`, 'success');
      setRefunded(true);
    } catch (error) {
      console.error(error);
      showError({
        title: 'Refund Failed',
        message: error.message || 'An error occurred while processing the refund',
        primaryActionLabel: 'Try Again',
        onPrimaryAction: requestRefund,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background/80 px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-[36px] border border-border/60 bg-card p-6 md:p-10 shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-light text-foreground/90">Refund Bounty</h1>
          <p className="text-sm text-muted-foreground">
            Request funds back on expired bounties that were never resolved.
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex gap-3">
          <AlertIcon size={20} color="#B87D00" />
          <div>
            <p className="font-medium text-foreground">Eligibility</p>
            <p className="text-sm text-amber-900/80 mt-1">
              Refunds are only available once the deadline has passed without a resolution, and only by the original sponsor.
            </p>
          </div>
        </div>

        {!isConnected ? (
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
            <div className="rounded-3xl border border-border/60 bg-muted/30 p-5 text-sm text-muted-foreground">
              <div className="flex items-center justify-between text-foreground">
                <span>Connected</span>
                <span className="font-medium">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              <div className="flex items-center justify-between text-foreground mt-2">
                <span>Network</span>
                <span className="font-medium">{network?.name} ({network?.token.symbol})</span>
              </div>
            </div>

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

            {bountyInfo && (
              <div className="rounded-3xl border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground space-y-2">
                <div className="flex items-center justify-between text-foreground">
                  <span>Amount</span>
                  <span className="font-medium">{bountyInfo.amount} {network?.token.symbol}</span>
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
                  <code className="text-xs">{bountyInfo.sponsor}</code>
                </div>
              </div>
            )}

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

        <StatusNotice status={status} />
      </div>
    </div>
  );
}
