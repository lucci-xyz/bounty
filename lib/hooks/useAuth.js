'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for managing GitHub OAuth authentication
 * @returns {Object} Auth state and methods
 * @returns {Object|null} returns.githubUser - Current GitHub user object or null
 * @returns {boolean} returns.loading - Whether auth check is in progress
 * @returns {Function} returns.checkAuth - Function to refresh auth status
 * @returns {Function} returns.loginWithGitHub - Function to initiate GitHub OAuth login
 */
export function useAuth() {
  const [githubUser, setGithubUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
      
      if (useDummyData) {
        // Use dummy user data for local development
        await new Promise(resolve => setTimeout(resolve, 300));
        setGithubUser({
          githubId: 123456789,
          githubUsername: 'testuser',
          avatarUrl: null,
          email: null
        });
      } else {
        const res = await fetch('/api/oauth/user', {
          credentials: 'include'
        });
        if (res.ok) {
          const user = await res.json();
          setGithubUser(user);
        } else {
          setGithubUser(null);
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setGithubUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGitHub = (returnTo = '/') => {
    window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent(returnTo)}`;
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return {
    githubUser,
    loading,
    checkAuth,
    loginWithGitHub
  };
}

