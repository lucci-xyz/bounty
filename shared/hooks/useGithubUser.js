'use client';
import { logger } from '@/shared/lib/logger';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getGithubUser } from '@/shared/api/user';

const IS_LOCAL_ENV = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
const USE_DUMMY_DATA = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

const DUMMY_USER = {
  githubId: 123456789,
  githubUsername: 'local-dev',
  avatarUrl: null,
};

export function useGithubUser({ requireAuth = false, redirectTo = '/', onUnauthenticated } = {}) {
  const router = useRouter();
  const [githubUser, setGithubUser] = useState(null);
  const [githubUserLoading, setGithubUserLoading] = useState(true);
  const [githubUserError, setGithubUserError] = useState(null);

  const loadGithubUser = useCallback(async () => {
    setGithubUserLoading(true);
    setGithubUserError(null);

    if (IS_LOCAL_ENV || USE_DUMMY_DATA) {
      setGithubUser(DUMMY_USER);
      setGithubUserLoading(false);
      return;
    }

    try {
      const user = await getGithubUser();
      setGithubUser(user);
    } catch (error) {
      logger.error('Failed to load GitHub user', error);
      setGithubUserError(error);
      setGithubUser(null);
    } finally {
      setGithubUserLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGithubUser();
  }, [loadGithubUser]);

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
    reloadGithubUser: loadGithubUser,
    isLocalMode: IS_LOCAL_ENV || USE_DUMMY_DATA,
  };
}

