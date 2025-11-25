'use client';

import { useCallback, useEffect, useState } from 'react';
import { getNetworkFees, withdrawNetworkFees } from '@/shared/api/admin';

/**
 * useNetworkFees
 * 
 * Hook to fetch and manage network fee balances for admin users.
 * Handles fetching fee data from all networks and withdrawing fees.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - If false, disables fetching.
 * @param {Function} [options.onUnauthorized] - Called if user is unauthorized (401/403).
 * 
 * @returns {Object} Contains networks data, loading states, and actions.
 */
export function useNetworkFees({ enabled = true, onUnauthorized } = {}) {
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawing, setWithdrawing] = useState({});

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
   * Withdraw fees from a specific network.
   * @param {string} alias - Network alias
   * @param {string} treasury - Treasury address
   * @param {string} [amount='0'] - Amount to withdraw (0 = all)
   * @returns {Promise<Object>} Transaction result
   */
  const withdraw = useCallback(async (alias, treasury, amount = '0') => {
    if (!enabled) {
      throw new Error('Admin access required');
    }
    setWithdrawing(prev => ({ ...prev, [alias]: true }));
    try {
      const result = await withdrawNetworkFees(alias, treasury, amount);
      // Refresh fees after successful withdrawal
      await fetchFees();
      return result;
    } finally {
      setWithdrawing(prev => ({ ...prev, [alias]: false }));
    }
  }, [enabled, fetchFees]);

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
    networks,
    loading,
    error,
    withdrawing,
    totals,
    refresh: fetchFees,
    withdraw
  };
}

