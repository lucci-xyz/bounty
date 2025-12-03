'use client';
import { logger } from '@/lib/logger';
import { useCallback } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { ethers } from 'ethers';
import { useNetwork } from '@/ui/providers/NetworkProvider';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import { ABIS } from '@/config/chain-registry';

/**
 * Hook for executing refund transactions.
 * 
 * @param {Object} options
 * @param {Object} options.currentBounty - The verified bounty to refund
 * @param {Object} options.selectedBounty - The selected bounty metadata
 * @param {Function} options.onSuccess - Callback after successful refund
 * @param {Function} options.showStatus - Function to show status messages
 * @returns {Object} Refund transaction functions
 */
export function useRefundTransaction({ currentBounty, selectedBounty, onSuccess, showStatus }) {
  const { chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { showError } = useErrorModal();
  const { registry, currentNetwork: network } = useNetwork();

  const requestRefund = useCallback(async () => {
    try {
      if (!currentBounty) {
        throw new Error('Please select a bounty first');
      }

      if (!currentBounty.canSelfRefund) {
        throw new Error('Connect the funding wallet to self-refund this bounty');
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

      // Update database after successful transaction
      showStatus('Updating database...', 'loading');
      try {
        const response = await fetch('/api/refunds/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bountyId: currentBounty.bountyId,
            txHash: receipt.hash
          })
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          logger.error('Database update failed:', error);
          showStatus(`✅ Refund successful on-chain, but database update failed. TX: ${receipt.hash}`, 'warning');
        } else {
          showStatus(`✅ Refund successful! TX: ${receipt.hash}`, 'success');
        }
      } catch (dbError) {
        logger.error('Database update error:', dbError);
        showStatus(`✅ Refund successful on-chain, but database update failed. TX: ${receipt.hash}`, 'warning');
      }
      
      if (onSuccess) {
        await onSuccess();
      }
    } catch (error) {
      logger.error('Refund transaction error:', error);
      // Clear loading status to prevent stuck loading messages
      showStatus('', '');
      showError({
        title: 'Refund Failed',
        message: error.message || 'An error occurred while processing the refund',
        primaryActionLabel: 'Try Again',
        onPrimaryAction: requestRefund,
      });
      throw error;
    }
  }, [currentBounty, selectedBounty, network, registry, chain?.id, showError, walletClient, switchChain, showStatus, onSuccess]);

  return {
    requestRefund
  };
}

