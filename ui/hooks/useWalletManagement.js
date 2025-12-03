'use client';
import { logger } from '@/lib/logger';

import { useCallback, useEffect, useState } from 'react';
import { getNonce, linkWallet, buildSiweMessage } from '@/api/wallet';

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
 * @param {object} props.walletClient       Wallet client for signing messages
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
  walletClient,
  chain,
  showError,
  fetchEarningsData,
  fetchSponsoredData,
  refreshProfileData
}) {
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
   * Close the wallet change modal unless a change is processing.
   */
  const closeChangeWalletModal = useCallback(() => {
    if (isProcessingChange) return;
    setShowChangeWalletModal(false);
    setChangeWalletStatus({ message: '', type: '' });
  }, [isProcessingChange]);

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

      if (!walletClient) {
        throw new Error('Wallet client not available');
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
      const signature = await walletClient.signMessage({
        message
      });

      setChangeWalletStatus({ message: 'Verifying signature...', type: 'info' });
      await linkWallet({
        address,
        signature,
        message,
        chainId: chain?.id || 1
      });

      setChangeWalletStatus({
        message: 'Wallet updated successfully!',
        type: 'success'
      });

      await fetchEarningsData?.();
      await fetchSponsoredData?.();
      await refreshProfileData?.();

      setTimeout(() => {
        setShowChangeWalletModal(false);
        setChangeWalletStatus({ message: '', type: '' });
      }, 1500);
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
    walletClient,
    refreshProfileData
  ]);

  /**
   * Automatically triggers wallet change flow if all required data is present
   * and the change modal is open.
   */
  useEffect(() => {
    if (
      showChangeWalletModal &&
      githubUser &&
      isConnected &&
      address &&
      walletClient &&
      !isProcessingChange
    ) {
      handleChangeWallet();
    }
  }, [
    address,
    githubUser,
    handleChangeWallet,
    isConnected,
    isProcessingChange,
    showChangeWalletModal,
    walletClient
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

