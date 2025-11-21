'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const BetaAccessContext = createContext({});

export function useBetaAccess() {
  return useContext(BetaAccessContext);
}

export function BetaAccessProvider({ children }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [betaStatus, setBetaStatus] = useState(null);

  useEffect(() => {
    checkBetaAccess();
  }, []);

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
      console.error('Error checking beta access:', error);
      setHasAccess(false);
      setBetaStatus('needsAuth');
    } finally {
      setLoading(false);
    }
  };

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

