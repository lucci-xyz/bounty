"use client";

import { AlertIcon } from '@shared/components/Icons';

/**
 * Modal to confirm deletion of the payout wallet.
 * 
 * @param {Object} props
 * @param {Object} props.deleteModal - Modal state and control handlers
 *    deleteModal.isOpen {boolean} - If the modal is open
 *    deleteModal.confirmation {string} - Current input for confirmation
 *    deleteModal.setConfirmation {function} - Updates confirmation input
 *    deleteModal.loading {boolean} - If deletion is in progress
 *    deleteModal.error {string|null} - Optional error message
 *    deleteModal.close {function} - Closes the modal
 *    deleteModal.handleDeleteWallet {function} - Handles deletion logic
 */
export function DeleteWalletModal({ deleteModal }) {
  // Hide modal if not open
  if (!deleteModal.isOpen) {
    return null;
  }

  return (
    // Overlay: clicking closes unless click is inside modal
    <div
      className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
      onClick={deleteModal.close}
    >
      {/* Modal container */}
      <div
        className="bg-card rounded-2xl max-w-md w-full p-8 shadow-lg relative border border-destructive/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning icon */}
        <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
          <AlertIcon size={28} color="var(--destructive)" />
        </div>

        {/* Modal title */}
        <h2
          className="text-destructive text-center mb-3"
          style={{ fontSize: '20px', fontWeight: 500 }}
        >
          Delete Payout Wallet
        </h2>

        {/* Warning message */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-5">
          <p
            className="text-muted-foreground"
            style={{ fontSize: '13px', lineHeight: 1.6, margin: 0, fontWeight: 300 }}
          >
            <strong>⚠️ Warning:</strong> You will not be able to receive payments for any active bounties
          </p>
        </div>

        {/* Confirmation instructions */}
        <p className="text-muted-foreground mb-2" style={{ fontSize: '13px', fontWeight: 400 }}>
          Type{' '}
          <span
            className="bg-muted px-2 py-0.5 rounded"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            I want to remove my wallet
          </span>{' '}
          to confirm:
        </p>

        {/* Confirmation input */}
        <input
          type="text"
          value={deleteModal.confirmation}
          onChange={e => deleteModal.setConfirmation(e.target.value)}
          placeholder="I want to remove my wallet"
          className="w-full rounded-xl border px-3 py-2"
          style={{
            fontSize: '14px',
            fontFamily: "'JetBrains Mono', monospace",
            borderColor: deleteModal.error ? 'var(--destructive)' : 'var(--border)',
            marginBottom: deleteModal.error ? '8px' : '20px'
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              deleteModal.handleDeleteWallet();
            }
          }}
        />

        {/* Error message, if present */}
        {deleteModal.error && (
          <p className="text-destructive mb-4" style={{ fontSize: '13px', marginTop: '-12px' }}>
            {deleteModal.error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={deleteModal.close}
            disabled={deleteModal.loading}
            className="premium-btn flex-1"
            style={{
              padding: '10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              fontSize: '14px',
              opacity: deleteModal.loading ? 0.5 : 1
            }}
          >
            Cancel
          </button>

          <button
            onClick={deleteModal.handleDeleteWallet}
            disabled={
              deleteModal.loading ||
              deleteModal.confirmation.toLowerCase() !== 'i want to remove my wallet'
            }
            className="premium-btn bg-destructive text-destructive-foreground flex-1"
            style={{
              padding: '10px',
              fontSize: '14px',
              opacity:
                deleteModal.loading ||
                deleteModal.confirmation.toLowerCase() !== 'i want to remove my wallet'
                  ? 0.5
                  : 1
            }}
          >
            {deleteModal.loading ? 'Deleting...' : 'Delete Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

