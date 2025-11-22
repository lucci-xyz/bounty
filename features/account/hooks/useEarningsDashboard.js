'use client';

/**
 * useEarningsDashboard
 *
 * Fetches and manages user earnings data for the dashboard.
 *
 * @param {Object} options
 * @param {boolean} [options.useDummyData] - Use mock data if true.
 * @param {boolean} [options.enabled=true] - Whether to enable data fetching.
 *
 * @returns {Object} {
 *   profile: User profile info,
 *   claimedBounties: List of claimed bounties,
 *   totalEarned: Total amount earned,
 *   fetchEarningsData: Function to refresh earnings data
 * }
 */
import { useCallback, useEffect, useState } from 'react';
import { getClaimedBounties, getUserProfile } from '@/shared/api/user';
import {
  dummyClaimedBounties,
  dummyProfile,
  dummyTotalEarned
} from '@data/dashboard';

export function useEarningsDashboard({ useDummyData, enabled = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [claimedBounties, setClaimedBounties] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);

  /**
   * Fetch earnings data for the user.
   */
  const fetchEarningsData = useCallback(async () => {
    if (!enabled) return;

    if (useDummyData) {
      setProfile(dummyProfile);
      setClaimedBounties(dummyClaimedBounties);
      setTotalEarned(dummyTotalEarned);
      return;
    }

    try {
      const [profileData, claimedData] = await Promise.all([
        getUserProfile(),
        getClaimedBounties()
      ]);

      if (profileData) setProfile(profileData);

      if (claimedData) {
        setClaimedBounties(claimedData.bounties || []);
        setTotalEarned(claimedData.totalEarned || 0);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  }, [enabled, useDummyData]);

  useEffect(() => {
    if (enabled) {
      fetchEarningsData();
    }
  }, [enabled, fetchEarningsData]);

  return {
    profile,
    claimedBounties,
    totalEarned,
    fetchEarningsData
  };
}
