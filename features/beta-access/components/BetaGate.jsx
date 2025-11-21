'use client';

import { useState } from 'react';
import { useBetaAccess } from '../providers/BetaAccessProvider';
import BetaAccessModal from './BetaAccessModal';

export function BetaGate({ children, fallback }) {
  const { hasAccess, betaStatus, loading } = useBetaAccess();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return fallback || null;
  }

  if (hasAccess) {
    return children;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '600',
          background: '#00827B',
          color: 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#39BEB7';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#00827B';
        }}
      >
        + Create Bounty
      </button>
      
      <BetaAccessModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        onAccessGranted={() => {
          setShowModal(false);
          window.location.reload();
        }}
      />
    </>
  );
}

