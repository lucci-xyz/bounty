'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { logger } from '@/shared/lib/logger';
import { getNetworkFees } from '@/shared/api/admin';
import { withdrawFees as withdrawFeesClient } from '@/features/account/lib/withdrawFees';

/**
 * Hook for managing protocol fee data and withdrawals.
 * Provides fee balances across all networks and wallet-based withdrawal functionality.
 *
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - Whether to fetch fee data
 * @param {Function} [options.onUnauthorized] - Called on 401/403 responses
 * @returns {Object} Fee data, wallet state, and withdrawal actions
 */
export function useNetworkFees({ enabled = true, onUnauthorized } = {}) {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState({});
  const [withdrawStatus, setWithdrawStatus] = useState({});

  // Wallet state from wagmi
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  const fetchFees = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getNetworkFees();
      setNetworks(data.networks || []);
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        onUnauthorized?.();
        setError('Admin access required');
        return;
      }
      logger.error('Failed to fetch network fees:', err);
      setError(err.message || 'Failed to fetch network fees');
    } finally {
      setLoading(false);
    }
  }, [enabled, onUnauthorized]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setNetworks([]);
      setError(null);
      return;
    }
    fetchFees();
  }, [fetchFees, enabled]);

  /**
   * Withdraw fees from a network. Requires connected wallet to be contract owner.
   */
  const withdraw = useCallback(async (alias, treasury, amount = '0') => {
    if (!enabled) throw new Error('Admin access required');
    if (!isConnected || !address) throw new Error('Please connect your wallet');
    if (!walletClient) throw new Error('Wallet not available. Please reconnect.');

    const network = networks.find(n => n.alias === alias);
    if (!network) throw new Error(`Network ${alias} not found`);

    // Build full network config for the withdrawal utility
    const networkConfig = {
      alias: network.alias,
      name: network.name,
      chainId: network.chainId,
      contracts: { escrow: network.escrowAddress },
      token: network.token,
      supports1559: network.supports1559 !== false
    };

    setWithdrawing(prev => ({ ...prev, [alias]: true }));
    setWithdrawStatus(prev => ({ ...prev, [alias]: { message: 'Initializing...', type: 'loading' } }));

    try {
      const result = await withdrawFeesClient({
        network: networkConfig,
        treasury,
        amount,
        walletContext: { address, isConnected, chain, walletClient },
        switchChain: switchChainAsync,
        onStatusChange: status => setWithdrawStatus(prev => ({ ...prev, [alias]: status }))
      });
      await fetchFees();
      return result;
    } catch (err) {
      setWithdrawStatus(prev => ({ ...prev, [alias]: { message: err.message, type: 'error' } }));
      throw err;
    } finally {
      setWithdrawing(prev => ({ ...prev, [alias]: false }));
    }
  }, [enabled, isConnected, address, walletClient, chain, switchChainAsync, networks, fetchFees]);

  const clearStatus = useCallback((alias) => {
    setWithdrawStatus(prev => {
      const next = { ...prev };
      delete next[alias];
      return next;
    });
  }, []);

  // Aggregate totals
  const totals = networks.reduce((acc, n) => {
    if (n.fees) {
      const available = parseFloat(n.fees.availableFormatted || '0');
      acc.totalAvailable += available;
      acc.totalAccrued += parseFloat(n.fees.totalAccruedFormatted || '0');
      acc.networksWithFees += available > 0 ? 1 : 0;
    }
    return acc;
  }, { totalAvailable: 0, totalAccrued: 0, networksWithFees: 0 });

  return {
    networks,
    loading,
    error,
    totals,
    wallet: { address, isConnected, chainId: chain?.id },
    withdrawing,
    withdrawStatus,
    refresh: fetchFees,
    withdraw,
    clearStatus
  };
}
