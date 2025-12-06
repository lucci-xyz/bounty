'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { useNetwork } from '@/ui/providers/NetworkProvider';
import { useBetaAccess } from '@/ui/hooks/useBetaAccess';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import { useFlag } from '@/ui/hooks/useFlag';
import { fundBounty } from '@/ui/pages/bounty/lib/fundBounty';
import { logger } from '@/lib/logger';

/**
 * React hook for managing the state and logic of the Attach Bounty form.
 *
 * Handles input values, network selection, token selection, beta access, and bounty funding flow.
 *
 * @param {Object} params
 * @param {Object} params.issueData - Data about the GitHub issue.
 * @returns {Object} Form state, handlers, and helpers.
 */
export function useAttachBountyForm({ issueData }) {
  // Form fields
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  // Token selection (for multi-token support)
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  // Status for success/error messages
  const [status, setStatus] = useState({ message: '', type: '' });
  // Processing state for funding
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Beta modal control
  const [showBetaModal, setShowBetaModal] = useState(false);
  const modalOpenedRef = useRef(false);
  // Fee state (bps) for funding breakdown
  const [feeBps, setFeeBps] = useState(100);
  // Multi-token feature flag
  const multiTokenEnabled = useFlag('multiTokenFeature', false);

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
   * Returns the list of available tokens for the current network.
   * Includes the default token plus any additional tokens.
   */
  const availableTokens = useMemo(() => {
    if (!network) return [];
    const tokens = [network.token];
    if (multiTokenEnabled && network.additionalTokens?.length > 0) {
      tokens.push(...network.additionalTokens);
    }
    return tokens;
  }, [network, multiTokenEnabled]);

  /**
   * The currently selected token (defaults to primary token).
   */
  const selectedToken = useMemo(() => {
    return availableTokens[selectedTokenIndex] || availableTokens[0] || network?.token;
  }, [availableTokens, selectedTokenIndex, network?.token]);

  /**
   * Reset token selection when network changes.
   */
  useEffect(() => {
    setSelectedTokenIndex(0);
  }, [network?.chainId]);

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
   * Once the modal is opened, keep it open until access is granted or user dismisses it.
   */
  useEffect(() => {
    if (!betaLoading) {
      // Only update if modal hasn't been opened yet, or if access was just granted
      if (!modalOpenedRef.current && !hasAccess) {
        setShowBetaModal(true);
        modalOpenedRef.current = true;
      } else if (hasAccess && modalOpenedRef.current) {
        // Access was granted, close modal and reset ref
        setShowBetaModal(false);
        modalOpenedRef.current = false;
      }
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
   * Fetch the current platform fee (bps) from the escrow contract for the selected network.
   */
  useEffect(() => {
    let cancelled = false;
    const fetchFeeBps = async () => {
      if (!network?.contracts?.escrow || !network?.rpcUrl) return;
      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        const feeReader = new ethers.Contract(
          network.contracts.escrow,
          ['function feeBps() view returns (uint16)'],
          provider
        );
        const onchainFeeBps = Number(await feeReader.feeBps());
        if (!cancelled && Number.isFinite(onchainFeeBps)) {
          setFeeBps(onchainFeeBps);
        }
      } catch (err) {
        logger.warn('Failed to fetch feeBps for network', network?.name, err);
      }
    };

    fetchFeeBps();
    return () => {
      cancelled = true;
    };
  }, [network?.contracts?.escrow, network?.name, network?.rpcUrl]);

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

    const token = selectedToken || network.token;

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
        // Pass selected token for multi-token support
        token,
        feeBps,
        callbacks: {
          showStatus,
          showError
        }
      });
    } catch (error) {
      console.error('Fund bounty error:', error);
      const message = error?.message || 'Failed to fund bounty';
      showStatus(message, 'error');
      showError?.({
        title: 'Funding failed',
        message
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
    selectedToken,
    feeBps,
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
   * Derived funding summary for the UI (net bounty, fee, total).
   */
  const fundingSummary = useMemo(() => {
    const token = selectedToken || network?.token;
    if (!token || !amount) {
      return {
        amountFormatted: '0',
        feeFormatted: '0',
        totalFormatted: '0',
        feeBps,
        tokenSymbol: token?.symbol || ''
      };
    }

    try {
      const amountWei = ethers.parseUnits(amount || '0', token.decimals);
      const feeWei = (amountWei * BigInt(feeBps)) / 10000n;
      const totalWei = amountWei + feeWei;

      return {
        amountFormatted: ethers.formatUnits(amountWei, token.decimals),
        feeFormatted: ethers.formatUnits(feeWei, token.decimals),
        totalFormatted: ethers.formatUnits(totalWei, token.decimals),
        feeBps,
        tokenSymbol: token.symbol
      };
    } catch {
      return {
        amountFormatted: '0',
        feeFormatted: '0',
        totalFormatted: '0',
        feeBps,
        tokenSymbol: token?.symbol || ''
      };
    }
  }, [amount, feeBps, network?.token, selectedToken]);

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
    hideBetaModal: () => {
      setShowBetaModal(false);
      modalOpenedRef.current = false;
    },
    supportedNetworkNames,
    isChainSupported,
    network,
    feeBps,
    fundingSummary,
    // Token selection (multi-token support)
    availableTokens,
    selectedToken,
    selectedTokenIndex,
    setSelectedTokenIndex,
    multiTokenEnabled,
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
