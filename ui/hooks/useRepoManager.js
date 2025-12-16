'use client';

import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import { getLinkHref } from '@/config/links';
import { useBetaAccess } from '@/ui/hooks/useBetaAccess';

/**
 * useRepoManager
 *
 * Hook for managing GitHub repositories where the BountyPay GitHub App is installed.
 * Fetches repositories via the /api/github/installations endpoint and manages modal state.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useDummyData] - Use mock data if true.
 * @returns {Object} - Repository state and handlers
 */
export function useRepoManager({ useDummyData = false } = {}) {
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showManageReposModal, setShowManageReposModal] = useState(false);

  // Beta access context
  const {
    hasAccess: hasBetaAccess,
    loading: betaLoading,
    betaProgramEnabled
  } = useBetaAccess();

  /**
   * Load GitHub repositories where the BountyPay app is installed.
   * Uses dummy data if enabled.
   */
  const loadRepositories = useCallback(async () => {
    if (useDummyData) {
      setRepositories([
        { id: 1, name: 'vercel/next.js', fullName: 'vercel/next.js', installationId: 123 },
        { id: 2, name: 'facebook/react', fullName: 'facebook/react', installationId: 456 }
      ]);
      return;
    }

    setLoadingRepos(true);
    try {
      const res = await fetch('/api/github/installations');
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      logger.error('Error loading repositories:', error);
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  }, [useDummyData]);

  /**
   * Open the manage repositories modal and load repos.
   */
  const handleManageRepos = useCallback(() => {
    setShowManageReposModal(true);
    loadRepositories();
  }, [loadRepositories]);

  /**
   * Close the manage repositories modal.
   */
  const closeManageReposModal = useCallback(() => {
    setShowManageReposModal(false);
  }, []);

  /**
   * Open GitHub installation page in a new tab.
   * Note: The ManageReposModal gates this behind beta access.
   */
  const handleInstallApp = useCallback(() => {
    const installationUrl = getLinkHref('github', 'appInstallation');
    window.open(installationUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return {
    repositories,
    loadingRepos,
    showManageReposModal,
    handleManageRepos,
    closeManageReposModal,
    handleInstallApp,
    hasBetaAccess: hasBetaAccess ?? false,
    betaLoading,
    betaProgramEnabled
  };
}
