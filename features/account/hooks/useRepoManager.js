'use client';

import { useCallback, useState } from 'react';
import { getLinkHref } from '@/shared/config/links';

/**
 * useRepoManager
 *
 * Hook for managing GitHub repositories and modal state.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useDummyData] - Use mock data if true.
 * @returns {Object} - Repository state and handlers
 */
export function useRepoManager({ useDummyData = false } = {}) {
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [showManageReposModal, setShowManageReposModal] = useState(false);

  /**
   * Load GitHub repositories.
   * Uses dummy data if enabled.
   */
  const loadRepositories = useCallback(async () => {
    if (useDummyData) {
      setRepositories([
        { id: 1, name: 'vercel/next.js', installed: true },
        { id: 2, name: 'facebook/react', installed: false }
      ]);
      return;
    }

    setLoadingRepos(true);
    try {
      const res = await fetch('/api/github/installations');
      const data = await res.json();
      setRepositories(data.repositories || []);
    } catch (error) {
      console.error('Error loading repositories:', error);
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
    handleInstallApp
  };
}
