'use client';

import { createContext, useContext, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUserProfile, getUserBounties, getUserStats, getClaimedBounties } from '@/shared/api/user';
import { checkAdminAccess } from '@/shared/api/admin';
import { useGithubUser } from '@/shared/hooks/useGithubUser';
import {
  dummyUserBounties,
  dummyStats,
  dummyClaimedBounties,
  dummyProfile,
  dummyTotalEarned
} from '@data/dashboard';

const AccountContext = createContext(null);

const USE_DUMMY_DATA = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

const QUERY_KEYS = {
  profile: ['account', 'profile'],
  sponsorBounties: ['account', 'sponsorBounties'],
  sponsorStats: ['account', 'sponsorStats'],
  earnings: ['account', 'earnings'],
  admin: ['account', 'admin']
};

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error'
};

function getQueryStatus(query, enabled) {
  if (!enabled) return STATUS.IDLE;
  if (query.status === 'error') return STATUS.ERROR;
  if (query.status === 'pending') return STATUS.LOADING;
  return STATUS.READY;
}

function combineStatuses(...statuses) {
  if (statuses.includes(STATUS.ERROR)) return STATUS.ERROR;
  if (statuses.includes(STATUS.LOADING)) return STATUS.LOADING;
  if (statuses.every((status) => status === STATUS.IDLE)) return STATUS.IDLE;
  return STATUS.READY;
}

export function AccountProvider({ children }) {
  const {
    githubUser,
    githubUserLoading,
    githubUserError,
    reloadGithubUser,
    isLocalMode
  } = useGithubUser({ requireAuth: true });
  const queryClient = useQueryClient();

  if (!AccountProvider.hasWarnedAboutMissingProvider && !queryClient) {
    // eslint-disable-next-line no-console
    console.warn('AccountProvider must be used within a QueryClientProvider');
    AccountProvider.hasWarnedAboutMissingProvider = true;
  }

  const queriesEnabled = Boolean(githubUser) && !USE_DUMMY_DATA;

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: getUserProfile,
    enabled: queriesEnabled,
    retry: 1
  });

  const sponsorBountiesQuery = useQuery({
    queryKey: QUERY_KEYS.sponsorBounties,
    queryFn: getUserBounties,
    enabled: queriesEnabled,
    retry: 1
  });

  const sponsorStatsQuery = useQuery({
    queryKey: QUERY_KEYS.sponsorStats,
    queryFn: getUserStats,
    enabled: queriesEnabled,
    retry: 1
  });

  const earningsQuery = useQuery({
    queryKey: QUERY_KEYS.earnings,
    queryFn: getClaimedBounties,
    enabled: queriesEnabled,
    retry: 1
  });

  const adminQuery = useQuery({
    queryKey: QUERY_KEYS.admin,
    queryFn: checkAdminAccess,
    enabled: queriesEnabled,
    retry: 1
  });

  const profileStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : getQueryStatus(profileQuery, queriesEnabled);
  const sponsorBountiesStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : getQueryStatus(sponsorBountiesQuery, queriesEnabled);
  const sponsorStatsStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : getQueryStatus(sponsorStatsQuery, queriesEnabled);
  const sponsorStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : combineStatuses(sponsorBountiesStatus, sponsorStatsStatus);
  const earningsStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : getQueryStatus(earningsQuery, queriesEnabled);
  const adminStatus = USE_DUMMY_DATA
    ? STATUS.READY
    : getQueryStatus(adminQuery, queriesEnabled);

  const sponsoredBounties = USE_DUMMY_DATA
    ? dummyUserBounties
    : sponsorBountiesQuery.data || [];
  const sponsorStats = USE_DUMMY_DATA
    ? dummyStats
    : sponsorStatsQuery.data || {};
  const claimedBounties = USE_DUMMY_DATA
    ? dummyClaimedBounties
    : earningsQuery.data?.bounties || [];
  const totalEarned = USE_DUMMY_DATA
    ? dummyTotalEarned
    : earningsQuery.data?.totalEarned || 0;
  const profileData = USE_DUMMY_DATA ? dummyProfile : profileQuery.data || null;
  const adminValue = USE_DUMMY_DATA ? false : Boolean(adminQuery.data);

  const sponsorError = USE_DUMMY_DATA
    ? null
    : sponsorBountiesQuery.error || sponsorStatsQuery.error || null;
  const earningsError = USE_DUMMY_DATA ? null : earningsQuery.error || null;
  const profileError = USE_DUMMY_DATA ? null : profileQuery.error || null;
  const adminError = USE_DUMMY_DATA ? null : adminQuery.error || null;

  const showEmptyState = sponsorStatus === STATUS.READY && sponsoredBounties.length === 0;

  const actions = useMemo(() => {
    if (USE_DUMMY_DATA) {
      return {
        refreshProfile: () => Promise.resolve(),
        refreshSponsor: () => Promise.resolve(),
        refreshEarnings: () => Promise.resolve(),
        refreshAdmin: () => Promise.resolve(),
        refreshAll: () => Promise.resolve()
      };
    }

    const invalidate = (key) =>
      queryClient.invalidateQueries({ queryKey: key, exact: false });

    return {
      refreshProfile: () => invalidate(QUERY_KEYS.profile),
      refreshSponsor: () => Promise.all([
        invalidate(QUERY_KEYS.sponsorBounties),
        invalidate(QUERY_KEYS.sponsorStats)
      ]),
      refreshEarnings: () => invalidate(QUERY_KEYS.earnings),
      refreshAdmin: () => invalidate(QUERY_KEYS.admin),
      refreshAll: () =>
        Promise.all([
          invalidate(QUERY_KEYS.profile),
          invalidate(QUERY_KEYS.sponsorBounties),
          invalidate(QUERY_KEYS.sponsorStats),
          invalidate(QUERY_KEYS.earnings),
          invalidate(QUERY_KEYS.admin)
        ])
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user: {
        data: githubUser,
        status: githubUserLoading
          ? STATUS.LOADING
          : githubUserError
            ? STATUS.ERROR
            : STATUS.READY,
        error: githubUserError || null,
        refresh: reloadGithubUser,
        isLocalMode
      },
      profile: {
        data: profileData,
        status: profileStatus,
        error: profileError,
        showEmptyState: profileStatus === STATUS.READY && !profileData?.wallet
      },
      sponsor: {
        sponsoredBounties,
        stats: sponsorStats,
        status: sponsorStatus,
        error: sponsorError,
        showEmptyState
      },
      earnings: {
        claimedBounties,
        totalEarned,
        status: earningsStatus,
        error: earningsError
      },
      admin: {
        isAdmin: adminValue,
        status: adminStatus,
        error: adminError
      },
      actions
    }),
    [
      githubUser,
      githubUserLoading,
      githubUserError,
      reloadGithubUser,
      isLocalMode,
      profileData,
      profileStatus,
      profileError,
      sponsoredBounties,
      sponsorStats,
      sponsorStatus,
      sponsorError,
      showEmptyState,
      claimedBounties,
      totalEarned,
      earningsStatus,
      earningsError,
      adminValue,
      adminStatus,
      adminError,
      actions
    ]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

AccountProvider.hasWarnedAboutMissingProvider = false;

export function useAccountData() {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccountData must be used within an AccountProvider');
  }
  return context;
}


