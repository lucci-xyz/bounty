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
      <h3 style={{ 
        marginBottom: '16px',
        fontSize: '20px',
        fontFamily: "'Space Grotesk', sans-serif"
      }}>
        Allowlist Management
      </h3>
      
      <div className="info-box" style={{ marginBottom: '24px', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>
          <strong>Optional:</strong> Restrict who can claim this bounty by adding wallet addresses to the allowlist.
          If the allowlist is empty, anyone can claim.
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="newAddress">Add Wallet Address</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="newAddress"
            type="text"
            placeholder="0x..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            style={{ marginBottom: 0, flex: 1 }}
          />
          <button
            onClick={addAddress}
            disabled={isProcessing}
            className="btn btn-primary"
            style={{ margin: 0, whiteSpace: 'nowrap' }}
          >
            {isProcessing ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`status ${status.type}`} style={{ marginBottom: '20px' }}>
          {status.message}
        </div>
      )}

      {allowlist.length > 0 ? (
        <div>
          <h4 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--color-text-primary)' }}>
            Allowed Addresses ({allowlist.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allowlist.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: 'var(--color-background-secondary)',
                  borderRadius: '8px',
                  gap: '12px'
                }}
              >
                <code style={{ 
                  fontSize: '13px',
                  wordBreak: 'break-all',
                  flex: 1
                }}>
                  {entry.allowedAddress}
                </code>
                <button
                  onClick={() => removeAddress(entry.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(255, 50, 0, 0.1)',
                    color: 'var(--color-error)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ 
          textAlign: 'center', 
          padding: '32px',
          background: 'var(--color-background-secondary)',
          borderRadius: '12px',
          color: 'var(--color-text-secondary)',
          fontSize: '14px'
        }}>
          No addresses in allowlist. Anyone can claim this bounty.
        </div>
      )}
    </div>
  );
}

