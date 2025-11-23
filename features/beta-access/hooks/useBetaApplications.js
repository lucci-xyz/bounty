'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBetaApplications, reviewBetaApplication } from '@/shared/api/beta';

/**
 * useBetaApplications
 *
 * Hook to fetch and manage beta access applications for admin review.
 *
 * @param {Object} [options]
 * @param {Function} [options.onUnauthorized] - Called if user is unauthorized (401).
 * @param {boolean} [options.enabled=true] - If false, disables fetching.
 *
 * @returns {Object} Contains applications, loading states, error info, and actions.
 */
export function useBetaApplications({ onUnauthorized, enabled = true } = {}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState({});

  /**
   * Fetches the list of beta applications.
   */
  const fetchApplications = useCallback(async () => {
    if (!enabled) {
      return;
    }
    try {
      setLoading(true);
      const data = await getBetaApplications();
      setApplications(data.applications || []);
      setError(null);
    } catch (err) {
      if (err?.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (err?.status === 403) {
        setError('You do not have admin access');
        return;
      }
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setApplications([]);
      setError(null);
      return;
    }
    fetchApplications();
  }, [fetchApplications, enabled]);

  /**
   * Reviews an application (approve or reject).
   * @param {string} applicationId
   * @param {string} action - 'approve' or 'reject'
   */
  const handleReview = useCallback(async (applicationId, action) => {
    if (!enabled) {
      throw new Error('Admin access required');
    }
    setProcessing((prev) => ({ ...prev, [applicationId]: true }));
    try {
      await reviewBetaApplication(applicationId, action);
      await fetchApplications();
    } catch (err) {
      throw err;
    } finally {
      setProcessing((prev) => ({ ...prev, [applicationId]: false }));
    }
  }, [enabled, fetchApplications]);

  /**
   * Applications currently pending review.
   */
  const pendingApplications = useMemo(
    () => applications.filter((app) => app.status === 'pending'),
    [applications]
  );

  /**
   * Applications that have already been reviewed.
   */
  const reviewedApplications = useMemo(
    () => applications.filter((app) => app.status !== 'pending'),
    [applications]
  );

  return {
    applications,
    pendingApplications,
    reviewedApplications,
    loading,
    error,
    processing,
    refresh: fetchApplications,
    handleReview
  };
}

