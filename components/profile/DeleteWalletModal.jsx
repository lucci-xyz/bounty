import { useState } from 'react';
import Modal from '@/components/Modal';
import { AlertIcon } from '@/components/Icons';

/**
 * Modal for deleting/unlinking a wallet
 */
export default function DeleteWalletModal({ isOpen, onClose, onDelete }) {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== 'i want to remove my wallet') {
      setError('Please type "I want to remove my wallet" to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onDelete(confirmation);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmation('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnBackdrop={!loading} maxWidth="500px">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5"
           style={{ background: 'rgba(255, 50, 0, 0.1)' }}>
        <AlertIcon size={28} color="var(--color-error)" />
      </div>

      <h2 className="text-2xl text-center mb-3 font-semibold" 
          style={{ color: 'var(--color-error)' }}>
        Delete Payout Wallet
      </h2>

      <div className="rounded-lg p-4 mb-5" 
           style={{
        background: 'rgba(255, 50, 0, 0.05)',
             border: '1px solid rgba(255, 50, 0, 0.2)'
      }}>
        <p className="text-sm leading-relaxed mb-3">
          <strong>⚠️ Warning:</strong> Deleting your payout wallet will have the following consequences:
        </p>
        <ul className="text-sm text-secondary leading-relaxed pl-5 m-0">
          <li>You will <strong>not be able to receive payments</strong> for any active bounties</li>
          <li>If any of your PRs are merged, you will <strong>lose the ability to claim those rewards</strong></li>
          <li>You can link a new wallet at any time to restore payout functionality</li>
        </ul>
      </div>

      <p className="text-sm text-secondary mb-2 font-medium">
        Type <span className="text-mono bg-secondary px-1.5 py-0.5 rounded">I want to remove my wallet</span> to confirm:
      </p>

      <input
        type="text"
        value={confirmation}
        onChange={(e) => {
          setConfirmation(e.target.value);
          setError('');
        }}
        placeholder="I want to remove my wallet"
        className="w-full text-mono rounded-md text-sm"
        style={{
          padding: '10px 12px',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          marginBottom: error ? '8px' : '20px'
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleDelete();
          }
        }}
      />

      {error && (
        <p className="text-sm -mt-3 mb-4" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleClose}
          disabled={loading}
          className="btn btn-secondary flex-1"
          style={{ opacity: loading ? 0.5 : 1 }}
        >
          Cancel
        </button>

        <button
          onClick={handleDelete}
          disabled={loading || confirmation.toLowerCase() !== 'i want to remove my wallet'}
          className="btn btn-danger flex-1"
        >
          {loading ? 'Deleting...' : 'Delete Wallet'}
        </button>
      </div>
    </Modal>
  );
}

