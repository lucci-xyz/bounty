'use client';
import { logger } from '@/shared/lib/logger';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { useGithubUser } from '@hooks/useGithubUser';
import { getUserProfile } from '@/shared/api/user';
import { getNonce, verifyWalletSignature, linkWallet, buildSiweMessage } from '@/shared/api/wallet';

/**
 * Hook for managing the wallet linking flow for users.
 *
 * - Detects account/profile status
 * - Handles GitHub authentication
 * - Links a wallet to the user's profile via SIWE signature
 * - Exposes useful state and actions
 *
 * @returns {object} Composed state, wallet info, GitHub info, and actions
 */
export function useLinkWalletFlow() {
  // True if user already has an account in our system
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  // True if user's wallet is already linked
  const [hasLinkedWallet, setHasLinkedWallet] = useState(false);
  // True after a successful profile+wallet link
  const [profileCreated, setProfileCreated] = useState(false);
  // Status for UI feedback (e.g. loading, error, etc.)
  const [status, setStatus] = useState({ message: '', type: '' });
  // Operation lock for async tasks
  const [isProcessing, setIsProcessing] = useState(false);
  // True after first mount
  const [isMounted, setIsMounted] = useState(false);
  // True if checking profile/account status
  const [checkingAccount, setCheckingAccount] = useState(false);
  // Linked wallet address, from state or returned from API
  const [linkedWalletAddress, setLinkedWalletAddress] = useState('');

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showError } = useErrorModal();
  const { githubUser, githubUserLoading, isLocalMode } = useGithubUser();

  // Mark as mounted after first render
  useEffect(() => { setIsMounted(true); }, []);

  /**
   * Starts GitHub OAuth authentication flow.
   */
  const authenticateGitHub = useCallback(() => {
    const returnUrl = window.location.pathname + window.location.search;
    const authUrl = `/api/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
    window.location.href = authUrl;
  }, []);

  /**
   * Create a user profile by linking their wallet using SIWE.
   * Handles message signing and backend linking.
   */
  const createProfileWithWallet = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setStatus({ message: 'Please sign the message in your wallet...', type: 'loading' });

      if (!isConnected || !address) {
        throw new Error('Please connect your wallet first');
      }
      if (!walletClient) {
        throw new Error('Wallet client not available');
      }
      if (!githubUser) {
        throw new Error('Missing GitHub session');
      }

      // Get nonce for SIWE
      const { nonce } = await getNonce();

      // Prepare SIWE message
      const { message: messageText } = await buildSiweMessage({
        address,
        nonce,
        chainId: chain?.id || 1,
        domain: window.location.host,
        uri: window.location.origin,
        statement: 'Link your wallet to receive BountyPay payments.'
      });

      if (!messageText) {
        throw new Error('Failed to build SIWE message');
      }

      // Ask for wallet signature
      const signature = await walletClient.signMessage({
        message: messageText
      });

      setStatus({ message: 'Verifying signature...', type: 'loading' });

      // Verify the signature
      await verifyWalletSignature({
        message: messageText,
        signature
      });

      setStatus({ message: 'Creating your profile...', type: 'loading' });

      // Link wallet/profile in backend
      await linkWallet({
        githubId: githubUser.githubId,
        githubUsername: githubUser.githubUsername,
        walletAddress: address
      });

      setProfileCreated(true);
      setLinkedWalletAddress(address);
      setHasLinkedWallet(true);
      setStatus({ message: '', type: '' });
    } catch (error) {
      logger.error(error);
      showError({
        title: 'Wallet Link Failed',
        message: error.message || 'An error occurred while linking your wallet',
        primaryActionLabel: 'Try Again',
        onPrimaryAction: createProfileWithWallet,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [address, chain?.id, githubUser, isConnected, isProcessing, showError, walletClient]);

  /**
   * If all dependencies are met, auto-trigger the linking attempt.
   */
  useEffect(() => {
    if (
      githubUser &&
      !hasLinkedWallet &&
      isConnected &&
      address &&
      walletClient &&
      !profileCreated &&
      !isProcessing
    ) {
      createProfileWithWallet();
    }
  }, [
    address,
    createProfileWithWallet,
    githubUser,
    hasLinkedWallet,
    isConnected,
    isProcessing,
    profileCreated,
    walletClient
  ]);

  /**
   * Checks if the user already has an account/profile and a linked wallet.
   * Updates state accordingly.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadProfileStatus() {
      if (githubUserLoading) return;
      if (!githubUser || isLocalMode) {
        setHasExistingAccount(false);
        setHasLinkedWallet(false);
        setLinkedWalletAddress('');
        return;
      }

      setCheckingAccount(true);
      try {
        const profile = await getUserProfile();
        if (cancelled) return;

        setHasExistingAccount(Boolean(profile?.user));
        if (profile?.wallet?.walletAddress) {
          setHasLinkedWallet(true);
          setLinkedWalletAddress(profile.wallet.walletAddress);
        } else {
          setHasLinkedWallet(false);
          setLinkedWalletAddress('');
        }
      } catch (error) {
        logger.error('Profile lookup failed', error);
      } finally {
        if (!cancelled) {
          setCheckingAccount(false);
        }
      }
    }

    loadProfileStatus();
    return () => {
      cancelled = true;
    };
  }, [githubUser, githubUserLoading, isLocalMode]);

  // Pick the address to display (current or linked)
  const displayWalletAddress = address || linkedWalletAddress;

  /**
   * A short version of the wallet address for UI display.
   */
  const shortAddress = useMemo(() => {
    if (!displayWalletAddress) return '';
    return `${displayWalletAddress.slice(0, 8)}...${displayWalletAddress.slice(-6)}`;
  }, [displayWalletAddress]);

  return {
    state: {
      hasExistingAccount,
      hasLinkedWallet,
      profileCreated,
      status,
      isProcessing,
      isMounted,
      checkingAccount,
      linkedWalletAddress,
      shortAddress,
      displayWalletAddress,
    },
    wallet: {
      address,
      isConnected,
      chain,
    },
    github: {
      user: githubUser,
      loading: githubUserLoading,
    },
    actions: {
      authenticateGitHub,
      createProfileWithWallet,
      setStatus,
    },
  };
}
