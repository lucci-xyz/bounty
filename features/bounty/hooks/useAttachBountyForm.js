import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { useNetwork } from '@/shared/components/NetworkProvider';
import { useBetaAccess } from '@/features/beta-access/providers/BetaAccessProvider';
import { useErrorModal } from '@/shared/components/ErrorModalProvider';
import { fundBounty } from '@/features/bounty/lib/fundBounty';

export function useAttachBountyForm({ issueData }) {
  const [amount, setAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showBetaModal, setShowBetaModal] = useState(false);

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
    currentNetwork: network
  } = useNetwork();

  const supportedNetworkNames = useMemo(
    () => supportedNetworks.map((config) => config.name),
    [supportedNetworks]
  );

  const isChainSupported = useMemo(() => {
    if (!chain?.id) {
      return true;
    }
    return supportedNetworks.some((config) => config.chainId === chain.id);
  }, [chain?.id, supportedNetworks]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!betaLoading) {
      setShowBetaModal(!hasAccess);
    }
  }, [betaLoading, hasAccess]);

  useEffect(() => {
    if (!registry || Object.keys(registry).length === 0) {
      return;
    }

    if (!isConnected || !chain?.id) {
      if (defaultAlias && selectedAlias !== defaultAlias) {
        setSelectedAlias(defaultAlias);
      }
      return;
    }

    const matchingEntry = Object.entries(registry).find(([_, config]) => {
      if (networkGroup && config.group !== networkGroup) {
        return false;
      }
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

  useEffect(() => {
    if (issueData.presetAmount) {
      setAmount(issueData.presetAmount);
    }
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 7);
    setDeadline(defaultDeadline.toISOString().split('T')[0]);
  }, [issueData.presetAmount]);

  const showStatus = useCallback((message, type) => {
    setStatus({ message, type });
  }, []);

  const handleFundBounty = useCallback(async () => {
    if (isProcessing) {
      return;
    }

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

