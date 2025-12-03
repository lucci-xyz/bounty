'use client';

import { useState } from 'react';
import { useBetaAccess } from '@/ui/hooks/useBetaAccess';
import BetaAccessModal from './BetaAccessModal';

/**
 * BetaGate
 *
 * A component that restricts access to its children unless the user
 * has beta access. If beta access is not granted, displays a button
 * that opens a modal for beta access application.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Content to render if access is granted.
 * @param {React.ReactNode} [props.fallback] - Optional fallback while loading.
 */
export function BetaGate({ children, fallback }) {
  const { hasAccess, loading } = useBetaAccess();
  const [showModal, setShowModal] = useState(false);

  // Show fallback while beta access status is loading
  if (loading) {
    return fallback || null;
  }

  // Render children if access is granted
  if (hasAccess) {
    return children;
  }

  // Render "Create Bounty" button and BetaAccessModal if not granted
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

export default BetaGate;
