'use client';
import { logger } from '@/shared/lib/logger';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { ABIS } from '@/shared/config/chain-registry';
import { getUserBounties } from '@/shared/api/user';

export function useRefundFlow() {
  const [bountyId, setBountyId] = useState('');
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [refunded, setRefunded] = useState(false);
  const [eligibleBounties, setEligibleBounties] = useState([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState(null);

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

  /**
   * Fetch eligible bounties for refund (expired, open, by sponsor)
   */
  const fetchEligibleBounties = useCallback(async () => {
    if (!isConnected || !address) {
      setEligibleBounties([]);
      return;
    }

    try {
      setLoadingBounties(true);
      const bounties = await getUserBounties();
      
      // Filter for eligible refund bounties:
      // - status is 'open'
      // - expired (deadline has passed)
      // - sponsor address matches connected wallet (required for on-chain refund)
      const now = Math.floor(Date.now() / 1000);
      const eligible = (bounties || []).filter((bounty) => {
        if (!bounty.sponsorAddress) return false;
        const lifecycleState = bounty.lifecycle?.state;
        const isExpired = lifecycleState ? lifecycleState === 'expired' : Number(bounty.deadline) < now;
        const isOpen = bounty.status === 'open';
        const isSponsor = bounty.sponsorAddress.toLowerCase() === address.toLowerCase();
        return isExpired && isOpen && isSponsor;
      });

      setEligibleBounties(eligible);
    } catch (error) {
      logger.error('Error fetching eligible bounties:', error);
      setEligibleBounties([]);
    } finally {
      setLoadingBounties(false);
    }
  }, [address, isConnected]);

  // Fetch eligible bounties when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      fetchEligibleBounties();
    } else {
      setEligibleBounties([]);
    }
  }, [isConnected, address, fetchEligibleBounties]);

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type });
  }, []);

  /**
   * Select a bounty from the eligible list
   */
  const selectBounty = useCallback(async (bounty) => {
    try {
      if (!network) {
        throw new Error('Network not initialized. Please try again.');
      }

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      // Find the network for this bounty and set it as selected
      const bountyNetwork = registry?.[bounty.network];
      if (!bountyNetwork) {
        throw new Error(`Network ${bounty.network} not found`);
      }

      // Set the network alias so the network provider uses the correct network
      if (selectedAlias !== bounty.network) {
        setSelectedAlias(bounty.network);
      }

      if (chain?.id !== bountyNetwork.chainId) {
        showStatus(`Switching to ${bountyNetwork.name}...`, 'loading');
        await switchChain({ chainId: bountyNetwork.chainId });
      }

      showStatus('Verifying bounty...', 'loading');

      const provider = new ethers.BrowserProvider(walletClient);
      const escrow = new ethers.Contract(bountyNetwork.contracts.escrow, ABIS.escrow, provider);
      const onChainBounty = await escrow.getBounty(bounty.bountyId);

      const amount = ethers.formatUnits(onChainBounty.amount, bountyNetwork.token.decimals);
      const deadline = new Date(Number(onChainBounty.deadline) * 1000);
      const statusText = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'][Number(onChainBounty.status)];
      const now = new Date();

      setBountyInfo({
        amount,
        deadline: deadline.toISOString().split('T')[0],
        status: statusText,
        sponsor: onChainBounty.sponsor
      });

      if (onChainBounty.sponsor.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Only the sponsor can request a refund');
      }

      if (statusText !== 'Open') {
        throw new Error(`Bounty is not open (status: ${statusText})`);
      }

      if (deadline > now) {
        throw new Error('Deadline has not passed yet');
      }

      setSelectedBounty(bounty);
      setCurrentBounty({ bountyId: bounty.bountyId, ...onChainBounty });
      showStatus('✓ Eligible for refund', 'success');
    } catch (error) {
      logger.error(error);
      showError({
        title: 'Bounty Verification Failed',
        message: error.message || 'An error occurred while verifying the bounty',
      });
      setBountyInfo(null);
      setCurrentBounty(null);
      setSelectedBounty(null);
    }
  }, [address, chain?.id, isConnected, network, registry, selectedAlias, setSelectedAlias, showError, walletClient, switchChain, showStatus]);

  const checkBounty = useCallback(async () => {
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

      if (chain?.id !== network.chainId) {
        showStatus(`Switching to ${network.name}...`, 'loading');
        await switchChain({ chainId: network.chainId });
      }

      showStatus('Checking bounty...', 'loading');

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
      logger.error(error);
      showError({
        title: 'Bounty Check Failed',
        message: error.message || 'An error occurred while checking the bounty',
      });
      setBountyInfo(null);
      setCurrentBounty(null);
    }
  }, [address, bountyId, chain?.id, isConnected, network, showError, walletClient, switchChain, showStatus]);

  const requestRefund = useCallback(async () => {
    try {
      if (!currentBounty) {
        throw new Error('Please select a bounty first');
      }

      // Get the network for the selected bounty
      const bountyNetwork = selectedBounty 
        ? registry?.[selectedBounty.network]
        : network;
      
      if (!bountyNetwork) {
        throw new Error('Network not initialized. Please try again.');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      if (chain?.id !== bountyNetwork.chainId) {
        showStatus(`Switching to ${bountyNetwork.name}...`, 'loading');
        await switchChain({ chainId: bountyNetwork.chainId });
      }

      showStatus('Requesting refund...', 'loading');

      const provider = new ethers.BrowserProvider(walletClient);
      const signer = await provider.getSigner();
      const escrow = new ethers.Contract(bountyNetwork.contracts.escrow, ABIS.escrow, signer);

      let txOverrides = {};
      if (!bountyNetwork.supports1559) {
        const feeData = await provider.getFeeData();
        txOverrides = {
          type: 0,
          gasPrice: feeData.gasPrice
        };
        logger.info('Using legacy transaction with gasPrice:', ethers.formatUnits(feeData.gasPrice, 'gwei'), 'gwei');
      }

      const tx = await escrow.refundExpired(currentBounty.bountyId, txOverrides);

      showStatus('Waiting for confirmation...', 'loading');
      const receipt = await tx.wait();

      showStatus(`✅ Refund successful! TX: ${receipt.hash}`, 'success');
      setRefunded(true);
      
      // Clear selected bounty and refresh eligible bounties after successful refund
      setSelectedBounty(null);
      setCurrentBounty(null);
      setBountyInfo(null);
      await fetchEligibleBounties();
    } catch (error) {
      logger.error(error);
      showError({
        title: 'Refund Failed',
        message: error.message || 'An error occurred while processing the refund',
        primaryActionLabel: 'Try Again',
        onPrimaryAction: requestRefund,
      });
    }
  }, [currentBounty, selectedBounty, network, registry, chain?.id, showError, walletClient, switchChain, showStatus, fetchEligibleBounties]);

  const sponsorDisplay = useMemo(() => {
    if (!bountyInfo?.sponsor) return '';
    return `${bountyInfo.sponsor.slice(0, 6)}...${bountyInfo.sponsor.slice(-4)}`;
  }, [bountyInfo]);

  return {
    inputs: {
      bountyId,
      setBountyId,
    },
    info: bountyInfo,
    status,
    refunded,
    wallet: {
      address,
      isConnected,
      network
    },
    actions: {
      checkBounty,
      requestRefund,
      showStatus,
      selectBounty,
      fetchEligibleBounties,
    },
    derived: {
      sponsorDisplay,
    },
    hasCurrentBounty: Boolean(currentBounty),
    eligibleBounties,
    loadingBounties,
    selectedBounty,
  };
}

