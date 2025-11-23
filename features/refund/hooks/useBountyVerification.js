'use client';
import { logger } from '@/shared/lib/logger';
import { useCallback, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { ABIS } from '@/shared/config/chain-registry';

/**
 * Hook for verifying a bounty's eligibility for refund on-chain.
 * 
 * @returns {Object} Verification state and functions
 */
export function useBountyVerification() {
  const [bountyInfo, setBountyInfo] = useState(null);
  const [currentBounty, setCurrentBounty] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [selectedBounty, setSelectedBounty] = useState(null);

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { showError } = useErrorModal();
  const { currentNetwork: network, registry, selectedAlias, setSelectedAlias } = useNetwork();

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type });
  }, []);

  /**
   * Clear bounty state
   */
  const clearBountyState = useCallback(() => {
    setBountyInfo(null);
    setCurrentBounty(null);
    setSelectedBounty(null);
  }, []);

  /**
   * Validate bounty eligibility
   */
  const validateBounty = useCallback(async (bounty, bountyId, network, address) => {
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
    
    return { bountyId, ...bounty };
  }, [showStatus]);


  /**
   * Verify a bounty from the eligible list
   */
  const verifyBounty = useCallback(async (bounty) => {
    try {
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

      const validated = await validateBounty(onChainBounty, bounty.bountyId, bountyNetwork, address);
      setSelectedBounty(bounty);
      return validated;
    } catch (error) {
      logger.error(error);
      showError({
        title: 'Bounty Verification Failed',
        message: error.message || 'An error occurred while verifying the bounty',
      });
      clearBountyState();
      throw error;
    }
  }, [address, chain?.id, isConnected, registry, selectedAlias, setSelectedAlias, showError, walletClient, switchChain, showStatus, validateBounty, clearBountyState]);

  return {
    bountyInfo,
    currentBounty,
    selectedBounty,
    status,
    verifyBounty,
    clearBountyState,
    showStatus
  };
}
