'use client';

/**
 * useBetaAccess
 *
 * React hook to access beta access state and actions.
 * Must be used inside a BetaAccessProvider.
 *
 * @returns {object} Beta access state and functions
 */
import { useContext } from 'react';
import { BetaAccessContext } from '@/features/beta-access/providers/BetaAccessProvider';

export function useBetaAccess() {
  const context = useContext(BetaAccessContext);
  if (!context) {
    throw new Error('useBetaAccess must be used within a BetaAccessProvider');
  }
  return context;
}

