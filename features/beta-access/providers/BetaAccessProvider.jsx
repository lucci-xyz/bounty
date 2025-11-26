'use client';
import { logger } from '@/shared/lib/logger';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * BetaAccessContext provides beta access status to the app.
 */
export const BetaAccessContext = createContext({});

/**
 * useBetaAccess
 * 
 * Custom hook to read beta access context.
 * Must be used inside BetaAccessProvider.
 */
export function useBetaAccess() {
  const context = useContext(BetaAccessContext);
  if (!context) {
    throw new Error('useBetaAccess must be used within a BetaAccessProvider');
  }
  return context;
}

/**
 * BetaAccessProvider
 * 
 * Fetches and provides beta access status to descendant components.
 */
export function BetaAccessProvider({ children }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [betaStatus, setBetaStatus] = useState(null);


  /**
   * Checks the user's beta access status from the backend.
   */
  const checkBetaAccess = useCallback(async () => {
    // Development override: Check for ?previewBetaModal=apply in URL or localStorage
    // This allows previewing the beta access modal without authentication
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const previewMode = urlParams.get('previewBetaModal') || localStorage.getItem('previewBetaModal');
      
      if (previewMode === 'apply') {
        setHasAccess(false);
        setBetaStatus('needsApplication');
        setLoading(false);
        return;
      }
      if (previewMode === 'signin') {
        setHasAccess(false);
        setBetaStatus('needsAuth');
        setLoading(false);
        return;
      }
      if (previewMode === 'pending') {
        setHasAccess(false);
        setBetaStatus('pending');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/beta/check');
      const data = await res.json();
      const approved = data.hasAccess === true;
      setHasAccess(approved);

      if (data.needsAuth) {
        setBetaStatus('needsAuth');
      } else if (data.needsApplication) {
        setBetaStatus('needsApplication');
      } else if (data.hasAccess) {
        setBetaStatus('approved');
      } else {
        setBetaStatus(data.status || 'pending');
      }
    } catch (error) {
      logger.error('Error checking beta access:', error);
      setHasAccess(false);
      setBetaStatus('needsAuth');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refreshes the beta access status from the backend.
   * Memoized to prevent unnecessary re-renders and API calls.
   */
  const refreshAccess = useCallback(() => {
    setLoading(true);
    checkBetaAccess();
  }, [checkBetaAccess]);

  // Initial check on mount
  useEffect(() => {
    checkBetaAccess();
  }, [checkBetaAccess]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  // This matches the pattern used in NetworkProvider and AccountProvider
  const value = useMemo(
    () => ({
      hasAccess,
      betaStatus,
      refreshAccess,
      loading
    }),
    [hasAccess, betaStatus, refreshAccess, loading]
  );

  return (
    <BetaAccessContext.Provider value={value}>
      {children}
    </BetaAccessContext.Provider>
  );
}

