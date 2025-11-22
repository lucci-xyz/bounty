'use client';

import { useCallback, useState } from 'react';
import { getAllowlist } from '@/shared/api/allowlist';

/**
 * useAllowlistData
 *
 * React hook for managing and fetching allowlists for bounties.
 *
 * @param {Object} [options]
 * @param {boolean} [options.useDummyData=false] - Use dummy data instead of real API.
 * @returns {Object} - Allowlist state and functions.
 *   - allowlists: Object with bountyId as keys and allowlist arrays as values
 *   - allowlistLoading: Object with bountyId as keys and boolean loading states as values
 *   - allowlistModalBountyId: Bounty ID for the currently open allowlist modal, or null
 *   - openAllowlistModal: Function to open allowlist modal for a given bounty
 *   - closeAllowlistModal: Function to close allowlist modal
 *   - ensureAllowlistLoaded: Fetches and returns allowlist if not loaded, else returns cached value
 */
export function useAllowlistData({ useDummyData = false } = {}) {
  // Allowlists per bountyId
  const [allowlists, setAllowlists] = useState({});
  // Loading state per bountyId
  const [allowlistLoading, setAllowlistLoading] = useState({});
  // Currently open modal's bountyId
  const [allowlistModalBountyId, setAllowlistModalBountyId] = useState(null);

  /**
   * Fetch the allowlist for a specific bounty.
   * Uses dummy data if enabled.
   * Updates loading and allowlists state.
   *
   * @param {string} bountyId
   * @returns {Promise<Array>} The allowlist for the bounty
   */
  const fetchAllowlistForBounty = useCallback(
    async (bountyId) => {
      if (!bountyId || allowlistLoading[bountyId]) {
        return allowlists[bountyId] || [];
      }

      if (useDummyData) {
        setAllowlists((prev) => ({ ...prev, [bountyId]: [] }));
        return [];
      }

      setAllowlistLoading((prev) => ({ ...prev, [bountyId]: true }));

      try {
        const data = await getAllowlist(bountyId);
        setAllowlists((prev) => ({ ...prev, [bountyId]: data }));
        return data;
      } catch (error) {
        console.error('Error fetching allowlist:', error);
        setAllowlists((prev) => ({ ...prev, [bountyId]: [] }));
        return [];
      } finally {
        setAllowlistLoading((prev) => ({ ...prev, [bountyId]: false }));
      }
    },
    [allowlists, allowlistLoading, useDummyData]
  );

  /**
   * Ensure the allowlist for a bounty is loaded.
   * Returns cached allowlist if available, otherwise fetches.
   *
   * @param {string} bountyId
   * @returns {Promise<Array>} The allowlist for the bounty
   */
  const ensureAllowlistLoaded = useCallback(
    (bountyId) => {
      if (!bountyId) {
        return Promise.resolve([]);
      }
      if (allowlists[bountyId] && allowlists[bountyId].length >= 0) {
        return Promise.resolve(allowlists[bountyId]);
      }
      return fetchAllowlistForBounty(bountyId);
    },
    [allowlists, fetchAllowlistForBounty]
  );

  /**
   * Open the allowlist modal for a bounty, ensuring its data is loaded.
   *
   * @param {string} bountyId
   */
  const openAllowlistModal = useCallback(
    async (bountyId) => {
      await ensureAllowlistLoaded(bountyId);
      setAllowlistModalBountyId(bountyId);
    },
    [ensureAllowlistLoaded]
  );

  /**
   * Close the currently open allowlist modal.
   */
  const closeAllowlistModal = useCallback(() => {
    setAllowlistModalBountyId(null);
  }, []);

  return {
    allowlists,
    allowlistLoading,
    allowlistModalBountyId,
    openAllowlistModal,
    closeAllowlistModal,
    ensureAllowlistLoaded
  };
}
