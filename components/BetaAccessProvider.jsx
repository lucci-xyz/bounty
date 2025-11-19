'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import BetaAccessModal from './BetaAccessModal';

const BetaAccessContext = createContext({});

export function useBetaAccess() {
  return useContext(BetaAccessContext);
}

export function BetaAccessProvider({ children }) {
  const [hasAccess, setHasAccess] = useState(null);
  const [showModal, setShowModal] = useState(true); // Show immediately
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBetaAccess();
  }, []);

  const checkBetaAccess = async () => {
    try {
      const res = await fetch('/api/beta/check');
      const data = await res.json();
      
      const approved = data.hasAccess === true;
      setHasAccess(approved);
      
      // Hide modal only if user has access
      if (approved) {
        setShowModal(false);
      }
    } catch (error) {
      console.error('Error checking beta access:', error);
      // On error, show the modal to be safe
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const refreshAccess = () => {
    setLoading(true);
    checkBetaAccess();
  };

  const handleModalClose = () => {
    // Only allow closing if user has access
    if (hasAccess) {
      setShowModal(false);
    }
  };

  // Block rendering of children until access is verified
  if (loading || !hasAccess) {
    return (
      <BetaAccessContext.Provider value={{ hasAccess, refreshAccess, loading }}>
        <BetaAccessModal 
          isOpen={showModal} 
          onClose={handleModalClose}
        />
      </BetaAccessContext.Provider>
    );
  }

  return (
    <BetaAccessContext.Provider value={{ hasAccess, refreshAccess, loading }}>
      {children}
      <BetaAccessModal 
        isOpen={showModal} 
        onClose={handleModalClose}
      />
    </BetaAccessContext.Provider>
  );
}

