'use client';
import { logger } from '@/shared/lib/logger';

/**
 * useSponsorDashboard
 *
 * Hook for managing sponsor dashboard data and state.
 *
 * @param {Object} options
 * @param {Object} options.githubUser - The GitHub user object.
 * @param {boolean} [options.useDummyData] - Use mock data if true.
 * @param {boolean} [options.enabled=true] - Enable data fetching if true.
 * @param {Function} [options.ensureAllowlistLoaded] - Function to ensure allowlist is loaded.
 *
 * @returns {Object} Sponsor dashboard state and functions.
 */
import { useCallback, useEffect, useState } from 'react';
import { getUserBounties, getUserStats } from '@/shared/api/user';
import { dummyUserBounties } from '@data/dashboard';

export function useSponsorDashboard({
  githubUser,
  useDummyData,
  enabled = true,
  ensureAllowlistLoaded
} = {}) {
  const [sponsoredBounties, setSponsoredBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);
  const [expandedBountyId, setExpandedBountyId] = useState(null);

  /**
   * Load sponsor data for the dashboard.
   */
  const loadSponsorData = useCallback(
    async () => {
      if (!enabled) return;

      if (useDummyData) {
        setSponsoredBounties(dummyUserBounties);
        setStats({
          totalBounties: dummyUserBounties.length,
          totalSpend: 12500,
          activeBounties: dummyUserBounties.filter((b) => b.status === 'open').length
        });
        setHasWallet(true);
        setShowEmptyState(dummyUserBounties.length === 0);
        return;
      }

      try {
        const [bountyData, statsData] = await Promise.all([
          getUserBounties(),
          getUserStats()
        ]);
        const normalizedBounties = bountyData || [];
        setSponsoredBounties(normalizedBounties);
        setStats(statsData || {});
        setHasWallet(true);
        setShowEmptyState(normalizedBounties.length === 0);
      } catch (error) {
        logger.error('Error loading sponsor dashboard:', error);
        setSponsoredBounties([]);
        setStats(null);
        setShowEmptyState(true);
      }
    },
    [enabled, useDummyData]
  );

  /**
   * Fetch sponsor data on mount or when dependencies change.
   */
  useEffect(() => {
    if (enabled) {
      loadSponsorData();
    }
  }, [enabled, loadSponsorData, githubUser]);

  /**
   * Expand or collapse a bounty, and ensure its allowlist is loaded.
   */
  const handleToggleBounty = useCallback(
    (bountyId) => {
      setExpandedBountyId((prev) => (prev === bountyId ? null : bountyId));
      ensureAllowlistLoaded?.(bountyId);
    },
    [ensureAllowlistLoaded]
  );

  return {
    stats,
    sponsoredBounties,
    hasWallet,
    showEmptyState,
    expandedBountyId,
    handleToggleBounty,
    fetchSponsoredData: loadSponsorData
  };
}
