'use client';
import { logger } from '@/shared/lib/logger';

/**
 * Hook to manage all logic and state for the Account page.
 *
 * Handles user, wallet, admin, allowlist, earnings, sponsorship, repo, beta, and tab state.
 *
 * @param {object} [options]
 * @param {string} [options.initialTab] - Tab id to show initially.
 * @returns {object} Account page state and actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { useGithubUser } from '@hooks/useGithubUser';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { checkAdminAccess } from '@/shared/api/admin';
import { useBetaApplications } from '@/features/beta-access';
import { useWalletManagement } from '@/features/wallet';
import {
  useAllowlistData,
  useSponsorDashboard,
  useEarningsDashboard,
  useRepoManager
} from '@/features/account';

export function useAccountPage({ initialTab: initialTabOverride } = {}) {
  // Determine initial tab from override, URL param, or default
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab');
  const initialTab = initialTabOverride || queryTab || 'sponsored';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  // Wallet/account info
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showError } = useErrorModal();

  // Feature/data hooks
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
  const { githubUser, githubUserLoading, isLocalMode } = useGithubUser({ requireAuth: true });

  const allowlist = useAllowlistData({ useDummyData });
  const sponsor = useSponsorDashboard({
    githubUser,
    useDummyData,
    enabled: activeTab === 'sponsored',
    ensureAllowlistLoaded: allowlist.ensureAllowlistLoaded
  });
  const earnings = useEarningsDashboard({
    useDummyData,
    enabled: activeTab === 'earnings'
  });
  const repoManager = useRepoManager({ useDummyData });

  // Wallet management logic
  const walletManagement = useWalletManagement({
    githubUser,
    isLocalMode,
    address,
    isConnected,
    walletClient,
    chain,
    showError,
    fetchEarningsData: earnings.fetchEarningsData,
    fetchSponsoredData: sponsor.fetchSponsoredData
  });

  // Handle unauthorized beta access
  const handleBetaUnauthorized = useCallback(() => {
    setIsAdmin(false);
  }, []);

  // Beta applications feature
  const beta = useBetaApplications({
    enabled: isAdmin && activeTab === 'admin',
    onUnauthorized: handleBetaUnauthorized
  });

  // Check and update admin status when dependencies change
  useEffect(() => {
    let cancelled = false;

    async function determineAdminStatus() {
      if (githubUserLoading) return;

      if (!githubUser) {
        if (!cancelled) {
          setIsAdmin(false);
          setAdminChecked(true);
        }
        return;
      }

      try {
        const adminStatus = await checkAdminAccess();
        if (!cancelled) {
          setIsAdmin(adminStatus);
        }
      } catch (error) {
        if (!cancelled) {
          setIsAdmin(false);
        }
        logger.error('Admin check error:', error);
      } finally {
        if (!cancelled) {
          setAdminChecked(true);
        }
      }
    }

    determineAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [githubUser, githubUserLoading]);

  // Log out and redirect to home
  const logout = useCallback(async () => {
    try {
      await fetch('/api/oauth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/';
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }, []);

  // Data for allowlist modal
  const allowlistModalBounty = allowlist.allowlistModalBountyId
    ? sponsor.sponsoredBounties.find(
        (bounty) => bounty.bountyId === allowlist.allowlistModalBountyId
      ) ?? null
    : null;
  const allowlistModalData = allowlist.allowlistModalBountyId
    ? allowlist.allowlists[allowlist.allowlistModalBountyId] || []
    : [];
  const allowlistModalLoading = allowlist.allowlistModalBountyId
    ? allowlist.allowlistLoading[allowlist.allowlistModalBountyId]
    : false;

  // Tabs for left nav
  const tabs = [
    { id: 'sponsored', label: 'Sponsored' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'controls', label: 'Controls' },
    { id: 'settings', label: 'Settings' },
    ...(adminChecked && isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  // Expose all state and actions needed by the account page
  return {
    githubUser,
    githubUserLoading,
    tabs,
    activeTab,
    setActiveTab,
    isAdmin,
    sponsor,
    earnings,
    allowlist,
    repoManager,
    walletManagement,
    beta,
    wallet: {
      address,
      isConnected
    },
    allowlistModal: {
      bounty: allowlistModalBounty,
      bountyId: allowlist.allowlistModalBountyId,
      data: allowlistModalData,
      loading: allowlistModalLoading,
      close: allowlist.closeAllowlistModal
    },
    logout,
    useDummyData
  };
}
