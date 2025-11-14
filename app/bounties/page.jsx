'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dummyBounties } from '@/dummy-data/bounties';

export default function BountiesPage() {
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBounties() {
      try {
        // Use dummy data for now
        // Uncomment below to fetch from API instead
        // const response = await fetch('/api/bounties/open');
        // if (!response.ok) {
        //   throw new Error('Failed to fetch bounties');
        // }
        // const data = await response.json();
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setBounties(dummyBounties);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchBounties();
  }, []);

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'USDC' ? 6 : 18;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDeadline(deadline) {
    const date = new Date(Number(deadline) * 1000);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      return `${diffDays} days`;
    }
  }

  function formatStars(stars) {
    if (stars >= 1000) {
      return `${(stars / 1000).toFixed(1)}k`;
    }
    return stars.toString();
  }

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1>Open Bounties</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading bounties...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
        <h1>Open Bounties</h1>
        <div className="card" style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid rgba(255, 59, 48, 0.3)' }}>
          <p style={{ color: '#ff3b30', margin: 0 }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '40px 20px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '12px' }}>Open Bounties</h1>
        <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>
          {bounties.length} {bounties.length === 1 ? 'bounty' : 'bounties'} available
        </p>
      </div>

      {bounties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            No open bounties at the moment.
          </p>
          <Link href="/" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bounties.map((bounty) => (
            <div key={bounty.bountyId} className="card" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '16px',
              padding: '24px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                <div style={{ flex: '1', minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <a 
                      href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        fontSize: '18px',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontWeight: '600'
                      }}
                    >
                      {bounty.repoFullName}#{bounty.issueNumber}
                    </a>
                    <span style={{ 
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ★ {formatStars(bounty.repoStars)}
                    </span>
                  </div>
                  
                  <p style={{ 
                    fontSize: '15px', 
                    color: 'var(--color-text-secondary)', 
                    lineHeight: '1.5',
                    margin: '0 0 12px 0'
                  }}>
                    {bounty.issueDescription}
                  </p>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '12px', alignItems: 'center' }}>
                    {bounty.language && (
                      <span style={{ 
                        padding: '4px 10px',
                        background: 'rgba(0, 130, 123, 0.1)',
                        borderRadius: '12px',
                        color: 'var(--color-primary)',
                        fontWeight: '500'
                      }}>
                        {bounty.language}
                      </span>
                    )}
                    {bounty.labels && bounty.labels.length > 0 && bounty.labels.map((label, idx) => (
                      <span 
                        key={idx}
                        style={{ 
                          padding: '4px 10px',
                          background: 'var(--color-background-secondary)',
                          borderRadius: '12px',
                          color: 'var(--color-text-secondary)'
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                
                {bounty.txHash ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${bounty.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      padding: '12px 20px',
                      background: 'rgba(131, 238, 232, 0.15)',
                      borderRadius: '8px',
                      textAlign: 'center',
                      minWidth: '140px',
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(131, 238, 232, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(131, 238, 232, 0.15)';
                    }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '4px' }}>
                      {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {formatDeadline(bounty.deadline)} left
                      <span>↗</span>
                    </div>
                  </a>
                ) : (
                  <div style={{ 
                    padding: '12px 20px',
                    background: 'rgba(131, 238, 232, 0.15)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '140px'
                  }}>
                    <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '4px' }}>
                      {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {formatDeadline(bounty.deadline)} left
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

