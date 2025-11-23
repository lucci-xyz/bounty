'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import { useBetaAccess } from '@/features/beta-access';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { fundBounty } from '@/features/bounty/lib/fundBounty';

/**
 * React hook for managing the state and logic of the Attach Bounty form.
 *
 * Handles input values, network selection, beta access, and bounty funding flow.
 *
 * @param {Object} params
 * @param {Object} params.issueData - Data about the GitHub issue.
 * @returns {Object} Form state, handlers, and helpers.
 */
export function useAttachBountyForm({ issueData }) {
  // Form fields
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  // Status for success/error messages
  const [status, setStatus] = useState({ message: '', type: '' });
  // Processing state for funding
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Beta modal control
  const [showBetaModal, setShowBetaModal] = useState(false);

  // Wallet/account/network context
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { hasAccess, betaStatus, loading: betaLoading } = useBetaAccess();
  const { showError } = useErrorModal();
  const {
    registry,
    networkGroup,
    defaultAlias,
    selectedAlias,
    setSelectedAlias,
    supportedNetworks,
    currentNetwork: network,
  } = useNetwork();

  /**
   * Returns a list of supported network names.
   */
  const supportedNetworkNames = useMemo(
    () => supportedNetworks.map((config) => config.name),
    [supportedNetworks]
  );

  /**
   * Checks if the wallet's currently selected chain is supported.
   */
  const isChainSupported = useMemo(() => {
    if (!chain?.id) return true;
    return supportedNetworks.some((config) => config.chainId === chain.id);
  }, [chain?.id, supportedNetworks]);

  /**
   * Used to detect if the component is mounted (for SSR/hydration).
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Updates the visibility of the beta access modal
   * depending on user access state.
   */
  useEffect(() => {
    if (!betaLoading) {
      setShowBetaModal(!hasAccess);
    }
  }, [betaLoading, hasAccess]);

  /**
   * Keeps selectedAlias in sync with the current network and registry settings.
   */
  useEffect(() => {
    if (!registry || Object.keys(registry).length === 0) return;

    if (!isConnected || !chain?.id) {
      if (defaultAlias && selectedAlias !== defaultAlias) {
        setSelectedAlias(defaultAlias);
      }
      return;
    }

    const matchingEntry = Object.entries(registry).find(([_, config]) => {
      if (networkGroup && config.group !== networkGroup) return false;
      return config.chainId === chain.id;
    });

    if (matchingEntry) {
      const [matchedAlias] = matchingEntry;
      if (matchedAlias !== selectedAlias) {
        setSelectedAlias(matchedAlias);
      }
    } else if (defaultAlias && selectedAlias !== defaultAlias) {
      setSelectedAlias(defaultAlias);
    }
  }, [chain?.id, defaultAlias, isConnected, networkGroup, registry, selectedAlias, setSelectedAlias]);

  /**
   * Initializes the form with preset values from the issue or defaults.
   */
  useEffect(() => {
    if (issueData.presetAmount) {
      setAmount(issueData.presetAmount);
    }
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setDeadline(defaultDeadline.toISOString().split('T')[0]);
  }, [issueData.presetAmount]);

  /**
   * Shows a status message (success, error, etc.).
   *
   * @param {string} message - The message to show.
   * @param {string} type - The type of status ('success', 'error', etc.).
   */
  const showStatus = useCallback((message, type) => {
    setStatus({ message, type });
  }, []);

  /**
   * Handles the "Fund Bounty" action: validates, runs and tracks the funding process.
   */
  const handleFundBounty = useCallback(async () => {
    if (isProcessing) return;

    if (!network) {
      showStatus('Network configuration not ready yet. Please wait a moment and try again.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      await fundBounty({
        amount,
        deadline,
        issueData,
        walletContext: {
          address,
          isConnected,
          chain,
          walletClient
        },
        networkContext: {
          network,
          switchChain,
          registry,
          networkGroup,
          selectedAlias,
          defaultAlias,
          setSelectedAlias,
          supportedNetworks
        },
        callbacks: {
          showStatus,
          showError
        }
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    address,
    amount,
    chain,
    deadline,
    defaultAlias,
    isConnected,
    isProcessing,
    issueData,
    network,
    networkGroup,
    registry,
    selectedAlias,
    setSelectedAlias,
    showError,
    showStatus,
    supportedNetworks,
    switchChain,
    walletClient
  ]);

  /**
   * Returns true if required issue data (repoFullName, issueNumber, repoId) is present.
   */
  const hasIssueData = Boolean(issueData.repoFullName && issueData.issueNumber && issueData.repoId);

  return {
    amount,
    setAmount,
    deadline,
    setDeadline,
    status,
    isProcessing,
    isMounted,
    showBetaModal,
    betaLoading,
    hasAccess,
    hideBetaModal: () => setShowBetaModal(false),
    supportedNetworkNames,
    isChainSupported,
    network,
    wallet: {
      address,
      isConnected,
      chain
    },
    betaStatus,
    hasIssueData,
    fundBounty: handleFundBounty,
    showStatus
  };
}
