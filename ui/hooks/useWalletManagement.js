'use client';
import { logger } from '@/lib/logger';

import { useCallback, useState } from 'react';
import { useSignMessage } from 'wagmi';
import { getNonce, linkWallet, buildSiweMessage, verifyWalletSignature } from '@/api/wallet';

const DELETE_CONFIRMATION_TEXT = 'i want to remove my wallet';

/**
 * Hook for managing wallet removal and wallet change flows.
 *
 * Provides state and handlers for showing modals, confirming deletion,
 * updating wallet, and handling loading/status states.
 *
 * @param {object} props
 * @param {object} props.githubUser         GitHub user object, if logged in
 * @param {boolean} props.isLocalMode       True if app is in local mode
 * @param {string} props.address            Connected wallet address
 * @param {boolean} props.isConnected       True if a wallet is connected
 * @param {object} props.chain              Chain info
 * @param {function} props.showError        Show error modal function
 * @param {function} props.fetchEarningsData Refreshes earnings after changes
 * @param {function} props.fetchSponsoredData Refreshes sponsored data after changes
 * @param {function} props.refreshProfileData Refreshes profile/wallet data after changes
 * @returns {object} Modal state and handlers for both deleting and changing wallet
 */
export function useWalletManagement({
  githubUser,
  isLocalMode,
  address,
  isConnected,
  chain,
  showError,
  fetchEarningsData,
  fetchSponsoredData,
  refreshProfileData
}) {
  // Use wagmi's useSignMessage hook for reliable message signing
  const { signMessageAsync } = useSignMessage();

  // Delete wallet modal state
  const [showDeleteWalletModal, setShowDeleteWalletModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Change wallet modal state
  const [showChangeWalletModal, setShowChangeWalletModal] = useState(false);
  const [changeWalletStatus, setChangeWalletStatus] = useState({
    message: '',
    type: ''
  });
  const [isProcessingChange, setIsProcessingChange] = useState(false);

  /**
   * Open the wallet deletion confirmation modal.
   */
  const openDeleteWalletModal = useCallback(() => {
    setShowDeleteWalletModal(true);
    setDeleteConfirmation('');
    setDeleteError('');
  }, []);

  /**
   * Close the wallet deletion confirmation modal and reset its state.
   */
  const closeDeleteWalletModal = useCallback(() => {
    setShowDeleteWalletModal(false);
    setDeleteConfirmation('');
    setDeleteError('');
  }, []);

  /**
   * Open the modal to change (replace) the connected wallet.
   */
  const openChangeWalletModal = useCallback(() => {
    setShowChangeWalletModal(true);
    setChangeWalletStatus({ message: '', type: '' });
    setIsProcessingChange(false);
  }, []);

  /**
   * Close the wallet change modal unless a change is processing (but allow closing on success).
   */
  const closeChangeWalletModal = useCallback(() => {
    // Allow closing if success, but not if still processing
    if (isProcessingChange && changeWalletStatus.type !== 'success') return;
    setShowChangeWalletModal(false);
    setChangeWalletStatus({ message: '', type: '' });
  }, [isProcessingChange, changeWalletStatus.type]);

  /**
   * Handles deleting the connected wallet after user confirmation.
   * Shows errors if the confirmation is not typed, or if API request fails.
   */
  const handleDeleteWallet = useCallback(async () => {
    if (deleteConfirmation.toLowerCase() !== DELETE_CONFIRMATION_TEXT) {
      setDeleteError('Please type "I want to remove my wallet" to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/wallet/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete wallet');
      }

      await fetchEarningsData?.();
      await refreshProfileData?.();
      setShowDeleteWalletModal(false);
      setDeleteConfirmation('');
    } catch (error) {
      logger.error('Error deleting wallet:', error);
      setDeleteError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteConfirmation, fetchEarningsData, refreshProfileData]);

  /**
   * Handles updating the user's wallet by requesting a SIWE message signature.
   * Verifies the signature and links the wallet. Shows UI status throughout.
   */
  const handleChangeWallet = useCallback(async () => {
    if (isProcessingChange) {
      return;
    }

    try {
      setIsProcessingChange(true);
      setChangeWalletStatus({ message: 'Connecting...', type: 'info' });

      if (!githubUser && !isLocalMode) {
        throw new Error('GitHub authentication required');
      }

      if (!address || !isConnected) {
        throw new Error('Please connect your wallet first');
      }

      setChangeWalletStatus({
        message: 'Getting verification nonce...',
        type: 'info'
      });
      const { nonce } = await getNonce();

      const { message } = await buildSiweMessage({
        address,
        nonce,
        chainId: chain?.id || 1,
        domain: window.location.host,
        uri: window.location.origin,
        statement: 'Sign in with Ethereum to link your wallet to BountyPay'
      });

      if (!message) {
        throw new Error('Failed to build SIWE message');
      }

      setChangeWalletStatus({
        message: 'Please sign the message in your wallet...',
        type: 'info'
      });
      
      // Use wagmi's signMessageAsync hook - more reliable than walletClient
      const signature = await signMessageAsync({ message });

      setChangeWalletStatus({ message: 'Verifying signature...', type: 'info' });
      // First verify the signature (stores wallet in session)
      await verifyWalletSignature({
        message,
        signature
      });

      setChangeWalletStatus({ message: 'Linking wallet...', type: 'info' });
      // Then link the wallet with GitHub account
      await linkWallet({
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        walletAddress: address
      });

      setChangeWalletStatus({
        message: 'Wallet updated successfully!',
        type: 'success'
      });

      // Refresh all data to ensure consistency across the app
      await Promise.all([
        fetchEarningsData?.(),
        fetchSponsoredData?.(),
        refreshProfileData?.()
      ]);
      
      // Don't auto-close - let user click "Done" to dismiss
    } catch (error) {
      logger.error('Error changing wallet:', error);
      const errorMessage =
        error.message || 'An error occurred while updating your wallet';
      showError?.({
        title: 'Wallet Update Failed',
        message: errorMessage,
        primaryActionLabel: 'Try Again',
        onPrimaryAction: () => handleChangeWallet()
      });
      setChangeWalletStatus({
        message: errorMessage || 'Failed to update wallet',
        type: 'error'
      });
    } finally {
      setIsProcessingChange(false);
    }
  }, [
    address,
    chain?.id,
    fetchEarningsData,
    fetchSponsoredData,
    githubUser,
    isConnected,
    isLocalMode,
    showError,
    signMessageAsync,
    refreshProfileData,
    isProcessingChange
  ]);

  return {
    deleteModal: {
      isOpen: showDeleteWalletModal,
      open: openDeleteWalletModal,
      close: closeDeleteWalletModal,
      confirmation: deleteConfirmation,
      setConfirmation: setDeleteConfirmation,
      loading: deleteLoading,
      error: deleteError,
      handleDeleteWallet
    },
    changeModal: {
      isOpen: showChangeWalletModal,
      open: openChangeWalletModal,
      close: closeChangeWalletModal,
      status: changeWalletStatus,
      isProcessing: isProcessingChange,
      handleChangeWallet
    }
  };
}
