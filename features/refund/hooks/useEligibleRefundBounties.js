'use client';
import { logger } from '@/shared/lib/logger';
import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { getUserBounties } from '@/shared/api/user';
import { dummyEligibleRefundBounties } from '@data/refund';

/**
 * Hook for fetching and filtering eligible refund bounties.
 * 
 * Eligible bounties are:
 * - Status is 'open'
 * - Expired (deadline has passed)
 * - Sponsor address matches connected wallet
 * 
 * @returns {Object} Eligible bounties state and fetch function
 */
export function useEligibleRefundBounties({ useDummyData = false } = {}) {
  const [eligibleBounties, setEligibleBounties] = useState([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const { address, isConnected } = useAccount();

  /**
   * Fetch eligible bounties for refund
   */
  const fetchEligibleBounties = useCallback(async () => {
    if (useDummyData) {
      setEligibleBounties(dummyEligibleRefundBounties);
      setLoadingBounties(false);
      return;
    }

    try {
      setLoadingBounties(true);
      const bounties = await getUserBounties();
      
      // Filter for eligible refund bounties
      const now = Math.floor(Date.now() / 1000);
      const eligible = (bounties || []).filter(bounty => {
        if (!bounty.sponsorAddress) return false;
        const isExpired = Number(bounty.deadline) < now;
        const isOpen = bounty.status === 'open';
        const isSponsor = bounty.sponsorAddress.toLowerCase() === address.toLowerCase();
        return isExpired && isOpen && isSponsor;
      });

      setEligibleBounties(eligible);
    } catch (error) {
      logger.error('Error fetching eligible bounties:', error);
      setEligibleBounties([]);
    } finally {
      setLoadingBounties(false);
    }
  }, [address, isConnected]);

  // Fetch eligible bounties when wallet connects
  useEffect(() => {
    if (useDummyData || (isConnected && address)) {
      fetchEligibleBounties();
    } else {
      setEligibleBounties([]);
    }
  }, [isConnected, address, fetchEligibleBounties]);

  return {
    eligibleBounties,
    loadingBounties,
    fetchEligibleBounties
  };
}

