'use client';
import { logger } from '@/shared/lib/logger';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { dummyBounties } from '@/shared/data/bounties';
import { TERMINAL_STATUSES } from '@/shared/lib/status';

const FETCH_DELAY_MS = 500;

function filterActiveBounties(list) {
  if (!Array.isArray(list)) return [];
  const now = Math.floor(Date.now() / 1000);
  return list.filter((bounty) => {
    if (!bounty) return false;
    const status = typeof bounty.status === 'string' ? bounty.status.toLowerCase() : '';
    if (TERMINAL_STATUSES.has(status)) {
      return false;
    }
    const deadline = Number(bounty.deadline);
    if (Number.isFinite(deadline)) {
      return deadline > now;
    }
    return true;
  });
}

/**
 * Fetches open bounties from the API.
 * @returns {Promise<Array>} An array of bounty objects.
 * @throws Will throw an error if the fetch fails.
 */
async function fetchOpenBounties() {
  const response = await fetch('/api/bounties/open');
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || 'Failed to fetch bounties');
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * React hook to load, filter, and manage the list of open bounties.
 *
 * Handles data fetching, search filtering, loading and error states.
 *
 * @returns {Object} Bounty feed state and helpers:
 *   - bounties: All loaded bounties.
 *   - filteredBounties: Bounties filtered by current search query.
 *   - hasAnyBounties: Boolean if there are any bounties loaded.
 *   - searchQuery: Current search text.
 *   - setSearchQuery: Update the search text.
 *   - clearSearch: Function to reset search query.
 *   - loading: Loading state.
 *   - error: Error message, if any.
 */
export function useBountyFeed() {
  const [bounties, setBounties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    /**
     * Loads bounties from either dummy data or the API.
     */
    async function loadBounties() {
      setLoading(true);
      setError(null);

      try {
        const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

        if (useDummyData) {
          await new Promise((resolve) => setTimeout(resolve, FETCH_DELAY_MS));
          if (isMounted) {
            setBounties(filterActiveBounties(dummyBounties));
          }
          return;
        }

        const data = await fetchOpenBounties();
        if (isMounted) {
          setBounties(filterActiveBounties(data));
        }
      } catch (err) {
        logger.error('Error fetching bounties:', err);
        if (isMounted) {
          setBounties([]);
          setError(err.message || 'Unable to load bounties');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBounties();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Returns bounties filtered by search query.
   */
  const filteredBounties = useMemo(() => {
    if (!searchQuery.trim()) {
      return bounties;
    }

    const query = searchQuery.trim().toLowerCase();

    return bounties.filter((bounty) => {
      const description = bounty.issueDescription?.toLowerCase() ?? '';
      const repo = bounty.repoFullName?.toLowerCase() ?? '';
      const matchesLabels = bounty.labels?.some((label) =>
        label?.toLowerCase().includes(query)
      );

      return (
        description.includes(query) ||
        repo.includes(query) ||
        matchesLabels
      );
    });
  }, [bounties, searchQuery]);

  /**
   * Clears the current search query.
   */
  const clearSearch = useCallback(() => setSearchQuery(''), []);

  return {
    bounties,
    filteredBounties,
    hasAnyBounties: bounties.length > 0,
    searchQuery,
    setSearchQuery,
    clearSearch,
    loading,
    error
  };
}

