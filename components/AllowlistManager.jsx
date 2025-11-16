'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

export default function AllowlistManager({ bountyId, initialAllowlist = [] }) {
  const [allowlist, setAllowlist] = useState(initialAllowlist);
  const [newAddress, setNewAddress] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const addAddress = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setStatus({ message: '', type: '' });
      
      if (!newAddress) {
        throw new Error('Please enter an address');
      }
      
      if (!ethers.isAddress(newAddress)) {
        throw new Error('Invalid Ethereum address');
      }
      
      const response = await fetch(`/api/allowlist/${bountyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newAddress })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add address');
      }
      
      const entry = await response.json();
      setAllowlist([...allowlist, entry]);
      setNewAddress('');
      setStatus({ message: 'Address added to allowlist', type: 'success' });
    } catch (error) {
      setStatus({ message: error.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const removeAddress = async (allowlistId) => {
    try {
      const response = await fetch(`/api/allowlist/${bountyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowlistId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove address');
      }
      
      setAllowlist(allowlist.filter(a => a.id !== allowlistId));
      setStatus({ message: 'Address removed from allowlist', type: 'success' });
    } catch (error) {
      setStatus({ message: error.message, type: 'error' });
    }
  };

  return (
    <div>
      <h3 className="mb-4 text-xl font-semibold">
        Allowlist Management
      </h3>
      
      <div className="info-box mb-6 text-sm">
        <p className="m-0">
          <strong>Optional:</strong> Restrict who can claim this bounty by adding wallet addresses to the allowlist.
          If the allowlist is empty, anyone can claim.
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="newAddress">Add Wallet Address</label>
        <div className="flex gap-2">
          <input
            id="newAddress"
            type="text"
            placeholder="0x..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="flex-1 mb-0"
          />
          <button
            onClick={addAddress}
            disabled={isProcessing}
            className="btn btn-primary whitespace-nowrap m-0"
          >
            {isProcessing ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`status ${status.type} mb-5`}>
          {status.message}
        </div>
      )}

      {allowlist.length > 0 ? (
        <div>
          <h4 className="text-base mb-3">
            Allowed Addresses ({allowlist.length})
          </h4>
          <div className="flex flex-col gap-2">
            {allowlist.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center p-3 bg-secondary rounded-lg gap-3"
              >
                <code className="text-sm break-all flex-1">
                  {entry.allowedAddress}
                </code>
                <button
                  onClick={() => removeAddress(entry.id)}
                  className="px-3 py-1.5 rounded-md border-0 text-xs font-medium whitespace-nowrap"
                  style={{
                    background: 'rgba(255, 50, 0, 0.1)',
                    color: 'var(--color-error)'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-8 bg-secondary rounded-xl text-secondary text-sm">
          No addresses in allowlist. Anyone can claim this bounty.
        </div>
      )}
    </div>
  );
}

