'use client';
import { logger } from '@/shared/lib/logger';

import { createContext, useContext, useEffect, useState } from 'react';

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

  useEffect(() => {
    checkBetaAccess();
  }, []);

  /**
   * Checks the user's beta access status from the backend.
   */
  const checkBetaAccess = async () => {
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
  };

  /**
   * Refreshes the beta access status from the backend.
   */
  const refreshAccess = () => {
    setLoading(true);
    checkBetaAccess();
  };

  return (
    <BetaAccessContext.Provider value={{ hasAccess, betaStatus, refreshAccess, loading }}>
      {children}
    </BetaAccessContext.Provider>
  );
}

