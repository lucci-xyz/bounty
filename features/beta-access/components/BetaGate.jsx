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
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/80"
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

