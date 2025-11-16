'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for fetching and managing bounties list
 * @param {Object} options - Configuration options
 * @param {string} options.endpoint - API endpoint to fetch from (default: '/api/bounties/open')
 * @param {boolean} options.fetchOnMount - Whether to fetch immediately on mount (default: true)
 * @param {string} options.initialSortBy - Initial sort field
 * @param {Array} options.initialLanguages - Initial language filters
 * @param {Array} options.initialLabels - Initial label filters
 * @returns {Object} Bounties state and methods
 */
export function useBounties({
  endpoint = '/api/bounties/open',
  fetchOnMount = true,
  initialSortBy = 'newest',
  initialLanguages = [],
  initialLabels = []
} = {}) {
  const [bounties, setBounties] = useState([]);
  const [filteredBounties, setFilteredBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [selectedLanguages, setSelectedLanguages] = useState(initialLanguages);
  const [selectedLabels, setSelectedLabels] = useState(initialLabels);

  const fetchBounties = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
      
      if (useDummyData) {
        // Load appropriate dummy data based on endpoint
        const isUserBounties = endpoint.includes('/api/user/bounties');
        
        if (isUserBounties) {
          const { dummyUserBounties } = await import('@/dummy-data/dashboard');
          await new Promise(resolve => setTimeout(resolve, 500));
          setBounties(dummyUserBounties);
          setFilteredBounties(dummyUserBounties);
        } else {
          const { dummyBounties } = await import('@/dummy-data/bounties');
          await new Promise(resolve => setTimeout(resolve, 500));
          setBounties(dummyBounties);
          setFilteredBounties(dummyBounties);
        }
      } else {
        const response = await fetch(endpoint, { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Failed to fetch bounties');
        }
        const data = await response.json();
        const bountiesArray = Array.isArray(data) ? data : [];
        setBounties(bountiesArray);
        setFilteredBounties(bountiesArray);
      }
    } catch (err) {
      console.error('Error fetching bounties:', err);
      setError(err.message);
      setBounties([]);
      setFilteredBounties([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  useEffect(() => {
    let result = [...bounties];

    // Apply language filter
    if (selectedLanguages.length > 0) {
      result = result.filter(b => selectedLanguages.includes(b.language));
    }

    // Apply label filter
    if (selectedLabels.length > 0) {
      result = result.filter(b => 
        b.labels && b.labels.some(label => selectedLabels.includes(label))
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'highest':
        result.sort((a, b) => Number(b.amount) - Number(a.amount));
        break;
      case 'lowest':
        result.sort((a, b) => Number(a.amount) - Number(b.amount));
        break;
      case 'deadline':
        result.sort((a, b) => Number(a.deadline) - Number(b.deadline));
        break;
      case 'stars':
        result.sort((a, b) => (b.repoStars || 0) - (a.repoStars || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    setFilteredBounties(result);
  }, [bounties, sortBy, selectedLanguages, selectedLabels]);

  useEffect(() => {
    if (fetchOnMount) {
      fetchBounties();
    }
  }, []);

  // Get unique languages and labels for filters
  const availableLanguages = ['all', ...new Set(bounties.map(b => b.language).filter(Boolean))];
  const availableLabels = ['all', ...new Set(bounties.flatMap(b => b.labels || []))];

  return {
    bounties: filteredBounties,
    allBounties: bounties,
    loading,
    error,
    sortBy,
    setSortBy,
    selectedLanguages,
    setSelectedLanguages,
    selectedLabels,
    setSelectedLabels,
    availableLanguages,
    availableLabels,
    fetchBounties
  };
}

