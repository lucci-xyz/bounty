'use client';

import { useState, useEffect } from 'react';

/**
 * Hook for managing wallet connection status
 * @param {number|string} githubId - GitHub user ID to check wallet for
 * @param {boolean} autoFetch - Whether to fetch immediately (default: false)
 * @returns {Object} Wallet state and methods
 */
export function useWallet(githubId, autoFetch = false) {
  const [hasWallet, setHasWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkWallet = async (id = githubId) => {
    if (!id) {
      setHasWallet(false);
      setWalletAddress(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';
      
      if (useDummyData) {
        // Use dummy wallet data for local development
        await new Promise(resolve => setTimeout(resolve, 300));
        setHasWallet(true);
        setWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
      } else {
        const res = await fetch(`/api/wallet/${id}`, {
          credentials: 'include'
        });
        
        if (res.ok) {
          const data = await res.json();
          setHasWallet(!!data.walletAddress);
          setWalletAddress(data.walletAddress || null);
        } else {
          setHasWallet(false);
          setWalletAddress(null);
        }
      }
    } catch (err) {
      console.error('Error checking wallet:', err);
      setError(err.message);
      setHasWallet(false);
      setWalletAddress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && githubId) {
      checkWallet(githubId);
    }
  }, [githubId, autoFetch]);

  return {
    hasWallet,
    walletAddress,
    loading,
    error,
    checkWallet
  };
}

