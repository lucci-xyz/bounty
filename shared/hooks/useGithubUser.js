'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getGithubUser } from '@/shared/api/user';

const IS_LOCAL_ENV = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
const USE_DUMMY_DATA = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

const DUMMY_USER = {
  githubId: 123456789,
  githubUsername: 'local-dev',
  avatarUrl: null
};

export function useGithubUser({ requireAuth = false, redirectTo = '/', onUnauthenticated } = {}) {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['account', 'githubUser'],
    queryFn: async () => {
      if (IS_LOCAL_ENV || USE_DUMMY_DATA) {
        return DUMMY_USER;
      }
      return getGithubUser();
    },
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  const githubUser = query.data || null;
  const githubUserLoading = query.isPending;
  const githubUserError = query.error || null;

  useEffect(() => {
    if (!requireAuth || githubUserLoading) {
      return;
    }
    if (githubUser) {
      return;
    }

    if (typeof onUnauthenticated === 'function') {
      onUnauthenticated();
    } else {
      router.push(redirectTo);
    }
  }, [githubUser, githubUserLoading, onUnauthenticated, redirectTo, requireAuth, router]);

  return {
    githubUser,
    githubUserLoading,
    githubUserError,
    reloadGithubUser: query.refetch,
    isLocalMode: IS_LOCAL_ENV || USE_DUMMY_DATA
  };
}


