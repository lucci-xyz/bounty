'use client';
import { logger } from '@/shared/lib/logger';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { getUserBounties } from '@/shared/api/user';

const normalizeAddress = (address) => address?.trim?.().toLowerCase?.() || '';

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
export function useEligibleRefundBounties({ sessionGithubId, linkedWalletAddress } = {}) {
  const [eligibleBounties, setEligibleBounties] = useState([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const { address, isConnected } = useAccount();

  /**
   * Fetch eligible bounties for refund
   */
  const normalizedLinked = useMemo(
    () => normalizeAddress(linkedWalletAddress) || null,
    [linkedWalletAddress]
  );
  const normalizedConnected = normalizeAddress(address);

  const fetchEligibleBounties = useCallback(async () => {
    try {
      setLoadingBounties(true);
      const bounties = await getUserBounties();
      
      const now = Math.floor(Date.now() / 1000);
      const sessionGithubIdNumber = sessionGithubId ? Number(sessionGithubId) : null;

      const eligible = (bounties || []).reduce((acc, bounty) => {
        if (!bounty?.sponsorAddress) {
          return acc;
        }

        const lifecycleState = bounty.lifecycle?.state;
        const isExpired = lifecycleState ? lifecycleState === 'expired' : Number(bounty.deadline) < now;
        const isOpen = bounty.status === 'open';
        if (!isExpired || !isOpen) {
          return acc;
        }

        const fundingWallet = normalizeAddress(bounty.sponsorAddress);
        const ownsByGithub = sessionGithubIdNumber
          ? Number(bounty.sponsorGithubId) === sessionGithubIdNumber
          : false;
        const ownsByWallet = normalizedConnected
          ? fundingWallet === normalizedConnected
          : false;

        if (!ownsByGithub && !ownsByWallet) {
          return acc;
        }

        const canSelfRefund = ownsByWallet;
        const expectedWallet = normalizedLinked || fundingWallet || null;

        acc.push({
          ...bounty,
          refundMeta: {
            canSelfRefund,
            fundingWallet: bounty.sponsorAddress,
            expectedWallet: expectedWallet,
            ownerGithubId: bounty.sponsorGithubId,
            connectedWallet: address || null
          }
        });
        return acc;
      }, []);

      setEligibleBounties(eligible);
    } catch (error) {
      // Handle auth errors gracefully (expected when not authenticated in local/dev)
      const status = error?.status || error?.response?.status;
      const isAuthError = status === 401 || status === 403;
      
      if (isAuthError) {
        // Silently handle auth errors - user just isn't authenticated yet
        // This is expected in local/dev mode and won't happen in production with proper auth
        setEligibleBounties([]);
        return;
      }
      
      // Only log unexpected errors (network issues, 500s, etc.)
      const errorMessage = error?.message || error?.payload?.error || error?.payload?.message || String(error || 'Unknown error');
      logger.error('Error fetching eligible bounties:', errorMessage);
      setEligibleBounties([]);
    } finally {
      setLoadingBounties(false);
    }
  }, [address, normalizedConnected, normalizedLinked, sessionGithubId]);

  // Fetch eligible bounties when wallet connects
  useEffect(() => {
    if ((sessionGithubId && sessionGithubId > 0) || (isConnected && address)) {
      fetchEligibleBounties();
    } else {
      setEligibleBounties([]);
    }
  }, [sessionGithubId, isConnected, address, fetchEligibleBounties]);

  return {
    eligibleBounties,
    loadingBounties,
    fetchEligibleBounties
  };
}
