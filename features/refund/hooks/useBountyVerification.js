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

  const { address, chain } = useAccount();
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
    if (!bounty || !bounty.sponsor) {
      throw new Error('Invalid bounty data');
    }

    const amount = ethers.formatUnits(bounty.amount, network.token.decimals);
    const deadline = new Date(Number(bounty.deadline) * 1000);
    const statusText = ['None', 'Open', 'Resolved', 'Refunded', 'Canceled'][Number(bounty.status)];
    const now = new Date();

    // Normalize addresses for comparison using .toLowerCase() pattern (matches codebase pattern)
    // Pattern used in: useRefundFlow.js:140, useEligibleRefundBounties.js:41
    const sponsorAddress = (bounty.sponsor || '').toLowerCase();
    const connectedAddress = (address || '').toLowerCase();
    const canSelfRefund = Boolean(sponsorAddress && connectedAddress && sponsorAddress === connectedAddress);

    setBountyInfo({
      amount,
      deadline: deadline.toISOString().split('T')[0],
      status: statusText,
      sponsor: bounty.sponsor, // Keep original format for display
      canSelfRefund
    });

    if (statusText !== 'Open') {
      throw new Error(`Bounty is not open (status: ${statusText})`);
    }

    if (deadline > now) {
      throw new Error('Deadline has not passed yet');
    }

    setCurrentBounty({ bountyId, ...bounty, canSelfRefund });
    if (canSelfRefund) {
      showStatus('✓ Eligible for refund', 'success');
    } else {
      showStatus('Connect the funding wallet to self-refund or use custodial flow.', 'warning');
    }

    return { bountyId, ...bounty, canSelfRefund };
  }, [showStatus]);


  /**
   * Verify a bounty from the eligible list
   */
  const verifyBounty = useCallback(async (bounty) => {
    try {
      // Find the network for this bounty and set it as selected
      const bountyNetwork = registry?.[bounty.network];
      if (!bountyNetwork) {
        throw new Error(`Network ${bounty.network} not found`);
      }

      // Set the network alias so the network provider uses the correct network
      if (selectedAlias !== bounty.network) {
        setSelectedAlias(bounty.network);
      }

      // Only attempt a wallet-driven switch when a wallet is actually connected.
      if (walletClient && chain?.id !== bountyNetwork.chainId) {
        showStatus(`Switching to ${bountyNetwork.name}...`, 'loading');
        await switchChain({ chainId: bountyNetwork.chainId });
      }

      showStatus('Verifying bounty...', 'loading');

      const provider = walletClient
        ? new ethers.BrowserProvider(walletClient)
        : new ethers.JsonRpcProvider(bountyNetwork.rpcUrl);

      const escrow = new ethers.Contract(bountyNetwork.contracts.escrow, ABIS.escrow, provider);

      // bountyId is already a hex string (0x...), ethers will convert it to bytes32
      const onChainBounty = await escrow.getBounty(bounty.bountyId);

      const validated = await validateBounty(onChainBounty, bounty.bountyId, bountyNetwork, address);

      const refundMeta = {
        ...bounty.refundMeta,
        canSelfRefund: validated.canSelfRefund,
        requiresCustodialRefund: !validated.canSelfRefund,
        fundingWallet: bounty.refundMeta?.fundingWallet || onChainBounty?.sponsor,
        connectedWallet: address || null,
      };

      setSelectedBounty({ ...bounty, refundMeta });
      return { ...validated, refundMeta };
    } catch (error) {
      logger.error('Bounty verification error:', error);
      // Clear loading status to prevent stuck "Verifying bounty..." message
      showStatus('', '');
      showError({
        title: 'Bounty Verification Failed',
        message: error.message || 'An error occurred while verifying the bounty',
      });
      clearBountyState();
      throw error;
    }
  }, [address, chain?.id, registry, selectedAlias, setSelectedAlias, showError, walletClient, switchChain, showStatus, validateBounty, clearBountyState]);

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
