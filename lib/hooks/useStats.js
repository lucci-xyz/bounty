'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for fetching user statistics
 * @param {boolean} autoFetch - Whether to fetch stats on mount (default: false)
 * @returns {Object} Stats state and methods
 */
export function useStats(autoFetch = false) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
      
      if (useDummyData) {
        const { dummyStats } = await import('@/dummy-data/dashboard');
        await new Promise(resolve => setTimeout(resolve, 300));
        setStats(dummyStats);
      } else {
        const res = await fetch('/api/user/stats', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          setStats(null);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [autoFetch]);

  return {
    stats,
    loading,
    error,
    fetchStats
  };
}

