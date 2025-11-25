'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi';
import { getNetworkFees } from '@/shared/api/admin';
import { withdrawFees as withdrawFeesClient } from '@/features/account/lib/withdrawFees';

/**
 * useNetworkFees
 * 
 * Hook to fetch and manage network fee balances for admin users.
 * Handles fetching fee data from all networks and withdrawing fees
 * using the connected wallet (RainbowKit/wagmi).
 * 
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - If false, disables fetching.
 * @param {Function} [options.onUnauthorized] - Called if user is unauthorized (401/403).
 * 
 * @returns {Object} Contains networks data, loading states, wallet info, and actions.
 */
export function useNetworkFees({ enabled = true, onUnauthorized } = {}) {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState({});
  const [withdrawStatus, setWithdrawStatus] = useState({});

  // Wallet connection state from wagmi
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();

  /**
   * Fetches fee balances from all networks.
   */
  const fetchFees = useCallback(async () => {
    if (!enabled) {
      return;
    }
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
   * Withdraw fees from a specific network using the connected wallet.
   * Requires the connected wallet to be the contract owner.
   * 
   * @param {string} alias - Network alias
   * @param {string} treasury - Treasury address to receive fees
   * @param {string} [amount='0'] - Amount to withdraw (0 = all)
   * @returns {Promise<Object>} Transaction result
   */
  const withdraw = useCallback(async (alias, treasury, amount = '0') => {
    if (!enabled) {
      throw new Error('Admin access required');
    }

    if (!isConnected || !address) {
      throw new Error('Please connect your wallet to withdraw fees');
    }

    if (!walletClient) {
      throw new Error('Wallet client not available. Please reconnect your wallet.');
    }

    // Find the network configuration
    const network = networks.find(n => n.alias === alias);
    if (!network) {
      throw new Error(`Network ${alias} not found`);
    }

    // Build full network config with alias included
    const networkConfig = {
      alias: network.alias,
      name: network.name,
      chainId: network.chainId,
      contracts: { escrow: network.escrowAddress },
      token: network.token,
      supports1559: network.supports1559 !== false // Default to true if not specified
    };

    setWithdrawing(prev => ({ ...prev, [alias]: true }));
    setWithdrawStatus(prev => ({ ...prev, [alias]: { message: 'Initializing...', type: 'loading' } }));

    try {
      const result = await withdrawFeesClient({
        network: networkConfig,
        treasury,
        amount,
        walletContext: {
          address,
          isConnected,
          chain,
          walletClient
        },
        switchChain: switchChainAsync,
        onStatusChange: (status) => {
          setWithdrawStatus(prev => ({ ...prev, [alias]: status }));
        }
      });

      // Refresh fees after successful withdrawal
      await fetchFees();
      
      return result;
    } catch (err) {
      setWithdrawStatus(prev => ({ 
        ...prev, 
        [alias]: { message: err.message, type: 'error' } 
      }));
      throw err;
    } finally {
      setWithdrawing(prev => ({ ...prev, [alias]: false }));
    }
  }, [enabled, isConnected, address, walletClient, chain, switchChainAsync, networks, fetchFees]);

  /**
   * Clear the status message for a specific network
   */
  const clearStatus = useCallback((alias) => {
    setWithdrawStatus(prev => {
      const next = { ...prev };
      delete next[alias];
      return next;
    });
  }, []);

  /**
   * Calculate totals across all networks.
   */
  const totals = networks.reduce((acc, network) => {
    if (network.fees) {
      acc.totalAvailable += parseFloat(network.fees.availableFormatted || '0');
      acc.totalAccrued += parseFloat(network.fees.totalAccruedFormatted || '0');
      acc.networksWithFees += parseFloat(network.fees.availableFormatted || '0') > 0 ? 1 : 0;
    }
    return acc;
  }, { totalAvailable: 0, totalAccrued: 0, networksWithFees: 0 });

  return {
    // Data
    networks,
    loading,
    error,
    totals,
    
    // Wallet state
    wallet: {
      address,
      isConnected,
      chainId: chain?.id
    },
    
    // Withdrawal state
    withdrawing,
    withdrawStatus,
    
    // Actions
    refresh: fetchFees,
    withdraw,
    clearStatus
  };
}
