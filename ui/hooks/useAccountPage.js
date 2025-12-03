'use client';
import { logger } from '@/lib/logger';

/**
 * Hook to manage all logic and state for the Account page.
 *
 * Handles user, wallet, admin, allowlist, earnings, sponsorship, repo, beta, and tab state.
 *
 * @param {object} [options]
 * @param {string} [options.initialTab] - Tab id to show initially.
 * @returns {object} Account page state and actions.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount, useWalletClient } from 'wagmi';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import { useBetaApplications } from '@/ui/hooks/useBetaApplications';
import { useWalletManagement } from '@/ui/hooks/useWalletManagement';
import { useAllowlistData } from '@/ui/hooks/useAllowlistData';
import { useRepoManager } from '@/ui/hooks/useRepoManager';
import { useNetworkFees } from '@/ui/hooks/useNetworkFees';
import { useAccountData } from '@/ui/providers/AccountProvider';

export function useAccountPage({ initialTab: initialTabOverride } = {}) {
  // Determine initial tab from override, URL param, or default
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab');
  const initialTab = initialTabOverride || queryTab || 'sponsored';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedBountyId, setExpandedBountyId] = useState(null);

  // Wallet/account info
  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { showError } = useErrorModal();

  // Feature/data hooks
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
  const accountData = useAccountData();
  const { user, sponsor, earnings, profile, admin, actions } = accountData;
  const githubUser = user.data;
  const githubUserLoading = user.status === 'loading';
  const isLocalMode = user.isLocalMode;

  const allowlist = useAllowlistData({ useDummyData });
  const repoManager = useRepoManager({ useDummyData });

  const handleToggleBounty = useCallback(
    (bountyId) => {
      setExpandedBountyId((prev) => (prev === bountyId ? null : bountyId));
      allowlist.ensureAllowlistLoaded?.(bountyId);
    },
    [allowlist]
  );

  const sponsorState = useMemo(
    () => ({
      ...sponsor,
      expandedBountyId,
      handleToggleBounty
    }),
    [sponsor, expandedBountyId, handleToggleBounty]
  );

  // Wallet management logic
  const walletManagement = useWalletManagement({
    githubUser,
    isLocalMode,
    address,
    isConnected,
    walletClient,
    chain,
    showError,
    fetchEarningsData: actions.refreshEarnings,
    fetchSponsoredData: actions.refreshSponsor,
    refreshProfileData: actions.refreshProfile
  });

  const showAdminTab = admin.status === 'ready' && admin.isAdmin;
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'sponsored', label: 'Sponsored' },
      { id: 'earnings', label: 'Earnings' },
      { id: 'controls', label: 'Controls' },
      { id: 'settings', label: 'Settings' }
    ];
    if (showAdminTab) {
      baseTabs.push({ id: 'admin', label: 'Admin' });
    }
    return baseTabs;
  }, [showAdminTab]);

  useEffect(() => {
    if (activeTab === 'admin' && !showAdminTab) {
      setActiveTab('sponsored');
    }
  }, [activeTab, showAdminTab]);

  // Handle unauthorized beta access
  const handleBetaUnauthorized = useCallback(() => {
    actions.refreshAdmin?.();
  }, [actions]);

  // Beta applications feature
  const beta = useBetaApplications({
    enabled: showAdminTab && activeTab === 'admin',
    onUnauthorized: handleBetaUnauthorized
  });

  // Network fees feature (admin only)
  const networkFees = useNetworkFees({
    enabled: showAdminTab && activeTab === 'admin',
    onUnauthorized: handleBetaUnauthorized
  });

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
    ? sponsorState.sponsoredBounties?.find(
        (bounty) => bounty.bountyId === allowlist.allowlistModalBountyId
      ) ?? null
    : null;
  const allowlistModalData = allowlist.allowlistModalBountyId
    ? allowlist.allowlists[allowlist.allowlistModalBountyId] || []
    : [];
  const allowlistModalLoading = allowlist.allowlistModalBountyId
    ? allowlist.allowlistLoading[allowlist.allowlistModalBountyId]
    : false;

  // Expose all state and actions needed by the account page
  return {
    githubUser,
    githubUserLoading,
    tabs,
    activeTab,
    setActiveTab,
    isAdmin: showAdminTab,
    sponsor: sponsorState,
    earnings,
    profile,
    adminStatus: admin.status,
    allowlist,
    repoManager,
    walletManagement,
    beta,
    networkFees,
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
    useDummyData,
    accountActions: actions
  };
}
