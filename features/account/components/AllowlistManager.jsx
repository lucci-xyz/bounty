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
      <h3 className="mb-4 text-xl font-semibold text-foreground">
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
            className="mb-0 flex-1"
          />
          <button
            onClick={addAddress}
            disabled={isProcessing}
            className="btn btn-primary whitespace-nowrap"
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
          <h4 className="mb-3 text-base font-semibold text-foreground">
            Allowed Addresses ({allowlist.length})
          </h4>
          <div className="flex flex-col gap-2">
            {allowlist.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3"
              >
                <code className="flex-1 break-all text-sm font-mono text-primary">
                  {entry.allowedAddress}
                </code>
                <button
                  onClick={() => removeAddress(entry.id)}
                  className="whitespace-nowrap rounded-md bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-muted/60 p-8 text-center text-sm text-muted-foreground">
          No addresses in allowlist. Anyone can claim this bounty.
        </div>
      )}
    </div>
  );
}

