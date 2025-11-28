"use client";

import { useState } from 'react';
import { GitHubIcon } from '@shared/components/Icons';
import BetaAccessModal from '@/features/beta-access/components/BetaAccessModal';

/**
 * Modal UI for managing repositories where BountyPay is installed.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether to display the modal.
 * @param {Array} props.repositories - List of repository objects with GitHub App installed.
 * @param {boolean} props.loading - Loading state for repositories.
 * @param {Function} props.close - Handler to close the modal.
 * @param {Function} props.handleInstallApp - Handler to start installation flow.
 * @param {boolean} props.hasBetaAccess - Whether user has beta access (gates install functionality).
 */
export function ManageReposModal({
  show,
  repositories,
  loading,
  close,
  handleInstallApp,
  hasBetaAccess
}) {
  const [showBetaModal, setShowBetaModal] = useState(false);

  // Don't render the modal if not shown
  if (!show) {
    return null;
  }

  /**
   * Handles the install app button click.
   * If user has beta access, proceed with installation.
   * Otherwise, show the beta access modal.
   */
  const onInstallClick = () => {
    if (hasBetaAccess) {
      handleInstallApp?.();
    } else {
      setShowBetaModal(true);
    }
  };

  /**
   * Closes the beta access modal.
   */
  const closeBetaModal = () => {
    setShowBetaModal(false);
  };

  /**
   * Called when beta access is granted - refresh the page.
   */
  const handleAccessGranted = () => {
    setShowBetaModal(false);
    window.location.reload();
  };

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
        onClick={close}
      >
        {/* Modal box */}
        <div
          className="bg-card rounded-2xl max-w-2xl w-full p-8 shadow-lg relative border border-border/40"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal header */}
          <div className="flex justify-between items-center mb-5">
            <h2
              className="text-foreground"
              style={{ fontSize: '20px', fontWeight: 500, margin: 0 }}
            >
              Manage Repositories
            </h2>
            <button
              onClick={close}
              className="text-muted-foreground hover:text-foreground transition-colors"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1
              }}
              aria-label="Close manage repositories modal"
            >
              ×
            </button>
          </div>

          {/* Content area */}
          {loading ? (
            // Loading state
            <div className="text-center py-10">
              <p className="text-muted-foreground" style={{ fontWeight: 300 }}>
                Loading repositories...
              </p>
            </div>
          ) : repositories.length === 0 ? (
            // No repositories installed
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <GitHubIcon size={32} color="var(--primary)" />
              </div>
              <p className="text-muted-foreground mb-6" style={{ fontSize: '14px', fontWeight: 300 }}>
                BountyPay isn't installed on any repositories yet
              </p>
              {hasBetaAccess ? (
                <button
                  onClick={onInstallClick}
                  className="premium-btn bg-primary text-primary-foreground"
                  style={{ fontSize: '14px', padding: '10px 24px' }}
                >
                  Install on a repository
                </button>
              ) : (
                <p className="text-xs text-muted-foreground/70">
                  Beta access required to install the GitHub App
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Repository list info */}
              <p
                className="text-muted-foreground mb-5"
                style={{ fontSize: '14px', lineHeight: 1.6, fontWeight: 300 }}
              >
                BountyPay is installed on the following repositories:
              </p>

              {/* Repositories list */}
              <div className="space-y-2 mb-6">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="px-4 py-3 border border-border/40 rounded-xl bg-muted/30 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <GitHubIcon size={18} color="var(--muted-foreground)" />
                    <span className="text-foreground" style={{ fontSize: '14px', fontWeight: 400 }}>
                      {repo.fullName}
                    </span>
                  </div>
                ))}
              </div>

              {/* Button to add/import another repository - gated behind beta access */}
              {hasBetaAccess ? (
                <button
                  onClick={onInstallClick}
                  className="premium-btn bg-primary text-primary-foreground w-full"
                  style={{ fontSize: '14px', padding: '10px' }}
                >
                  Add / import repository
                </button>
              ) : (
                <p className="text-center text-xs text-muted-foreground/70">
                  Beta access required to add more repositories
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Beta Access Modal - shown when user tries to install without beta access */}
      <BetaAccessModal
        isOpen={showBetaModal}
        onClose={closeBetaModal}
        onAccessGranted={handleAccessGranted}
      />
    </>
  );
}
