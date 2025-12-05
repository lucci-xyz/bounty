'use client';
import { useCallback, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';

import { buildSiweMessage, getNonce, linkWallet, verifyWalletSignature } from '@/api/wallet';

const DELETE_CONFIRMATION_TEXT = 'i want to remove my wallet';
const DEFAULT_STATUS = { message: '', type: '' };

/**
 * Hook for managing payout wallet updates and deletions.
 */
export function useWalletManagement({
  githubUser,
  isLocalMode,
  showError,
  fetchEarningsData,
  fetchSponsoredData,
  refreshProfileData
}) {
  const { signMessageAsync } = useSignMessage();

  const waitingForPayoutChangeRef = useRef(false);
  const handleChangeWalletRef = useRef(null);
  const callbacksRef = useRef({ onDone: null, onError: null });

  // Delete wallet modal state
  const [showDeleteWalletModal, setShowDeleteWalletModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Change wallet modal + status state
  const [showChangeWalletModal, setShowChangeWalletModal] = useState(false);
  const [changeWalletStatus, setChangeWalletStatus] = useState(DEFAULT_STATUS);
  const [isProcessingChange, setIsProcessingChange] = useState(false);
  const [isAwaitingWallet, setIsAwaitingWallet] = useState(false);
  const [updatedWalletAddress, setUpdatedWalletAddress] = useState(null);

  const clearChangeFlow = useCallback(() => {
    waitingForPayoutChangeRef.current = false;
    handleChangeWalletRef.current = null;
    callbacksRef.current = { onDone: null, onError: null };
    setIsAwaitingWallet(false);
    setIsProcessingChange(false);
  }, []);

  const { address: connectedAddress, chain } = useAccount({
    onConnect(connectInfo) {
      if (waitingForPayoutChangeRef.current && handleChangeWalletRef.current) {
        handleChangeWalletRef.current(connectInfo);
      }
    },
    onDisconnect() {
      clearChangeFlow();
    }
  });

  const chainId = chain?.id;

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
   * Open the modal to change (replace) the connected wallet.
   */
  const openChangeWalletModal = useCallback(() => {
    clearChangeFlow();
    setShowChangeWalletModal(true);
    setUpdatedWalletAddress(null);
    setChangeWalletStatus(DEFAULT_STATUS);
  }, [clearChangeFlow]);

  /**
   * Close the wallet change modal unless a change is processing (but allow closing on success).
   */
  const closeChangeWalletModal = useCallback(() => {
    if (isProcessingChange && changeWalletStatus.type !== 'success') return;
    clearChangeFlow();
    setShowChangeWalletModal(false);
    setUpdatedWalletAddress(null);
  }, [changeWalletStatus.type, clearChangeFlow, isProcessingChange]);

  const cancelPayoutWalletChange = useCallback(() => {
    clearChangeFlow();
    setChangeWalletStatus(DEFAULT_STATUS);
    setUpdatedWalletAddress(null);
  }, [clearChangeFlow]);

  /**
   * Start the payout wallet change flow by waiting for RainbowKit to connect a wallet.
   * Returns true if the flow started, false if already in progress.
   */
  const startPayoutWalletChange = useCallback(
    (onDone, onError) => {
      if (isProcessingChange) return false;

      if (isAwaitingWallet) {
        clearChangeFlow();
      }

      setUpdatedWalletAddress(null);
      setChangeWalletStatus({
        message: 'Waiting for wallet selection...',
        type: 'info'
      });

      callbacksRef.current = {
        onDone: onDone || null,
        onError: onError || null
      };
      waitingForPayoutChangeRef.current = true;
      setIsAwaitingWallet(true);

      handleChangeWalletRef.current = async (connectInfo) => {
        waitingForPayoutChangeRef.current = false;
        setIsAwaitingWallet(false);

        try {
          setIsProcessingChange(true);

          if (!githubUser && !isLocalMode) {
            throw new Error('GitHub authentication required');
          }

          const nextAddress =
            connectInfo?.address ||
            connectInfo?.account?.address ||
            connectedAddress;
          const nextChainId =
            connectInfo?.chain?.id ??
            connectInfo?.chainId ??
            chainId;

          if (!nextAddress || !isAddress(nextAddress)) {
            throw new Error('Invalid wallet address');
          }

          if (typeof nextChainId !== 'number') {
            throw new Error('Invalid network');
          }

          setChangeWalletStatus({
            message: 'Getting verification nonce...',
            type: 'info'
          });
          const { nonce } = await getNonce();

          const domain =
            typeof window !== 'undefined' ? window.location.host : 'localhost';
          const uri =
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

          const { message } = await buildSiweMessage({
            address: nextAddress,
            nonce,
            chainId: nextChainId,
            domain,
            uri,
            statement: 'Sign in with Ethereum to link your wallet to BountyPay'
          });

          if (!message) {
            throw new Error('Failed to build SIWE message');
          }

          setChangeWalletStatus({
            message: 'Please sign the message in your wallet...',
            type: 'info'
          });
          const signature = await signMessageAsync({ message });

          setChangeWalletStatus({ message: 'Verifying signature...', type: 'info' });
          await verifyWalletSignature({
            message,
            signature
          });

          setChangeWalletStatus({ message: 'Linking wallet...', type: 'info' });
          await linkWallet({
            githubId: githubUser.githubId,
            githubUsername: githubUser.githubUsername,
            walletAddress: nextAddress
          });

          setChangeWalletStatus({
            message: 'Wallet updated successfully!',
            type: 'success'
          });
          setUpdatedWalletAddress(nextAddress);

          await Promise.all([
            fetchEarningsData?.(),
            fetchSponsoredData?.(),
            refreshProfileData?.()
          ]);

          callbacksRef.current.onDone?.(nextAddress);
        } catch (error) {
          logger.error('Error changing wallet:', error);
          const errorMessage =
            error?.message || 'An error occurred while updating your wallet';
          setChangeWalletStatus({
            message: errorMessage,
            type: 'error'
          });
          callbacksRef.current.onError?.(error);
          showError?.({
            title: 'Wallet Update Failed',
            message: errorMessage
          });
        } finally {
          setIsProcessingChange(false);
          clearChangeFlow();
        }
      };

      return true;
    },
    [
      chainId,
      clearChangeFlow,
      connectedAddress,
      fetchEarningsData,
      fetchSponsoredData,
      githubUser,
      isAwaitingWallet,
      isLocalMode,
      isProcessingChange,
      refreshProfileData,
      showError,
      signMessageAsync
    ]
  );

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
      isAwaitingWallet,
      updatedAddress: updatedWalletAddress,
      startPayoutWalletChange,
      cancelPayoutWalletChange
    }
  };
}
