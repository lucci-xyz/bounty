'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AllowlistManager from '@/components/AllowlistManager';

export default function BountyDetail({ params }) {
  const router = useRouter();
  const [bounty, setBounty] = useState(null);
  const [allowlist, setAllowlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [githubUser, setGithubUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Check auth
      const authRes = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (!authRes.ok) {
        router.push('/dashboard');
        return;
      }

      const user = await authRes.json();
      setGithubUser(user);

      // Get bounty ID from params
      const { bountyId } = await params;

      // Fetch bounty details
      const bountyRes = await fetch(`/api/bounty/${bountyId}`);
      if (bountyRes.ok) {
        const bountyData = await bountyRes.json();
        
        // Verify user owns this bounty
        if (bountyData.sponsorGithubId !== user.githubId) {
          router.push('/dashboard');
          return;
        }
        
        setBounty(bountyData);
      }

      // Fetch allowlist
      const allowlistRes = await fetch(`/api/allowlist/${bountyId}`, {
        credentials: 'include'
      });
      
      if (allowlistRes.ok) {
        const allowlistData = await allowlistRes.json();
        setAllowlist(allowlistData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatDate(timestamp) {
    return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'var(--color-primary)';
      case 'resolved':
        return 'var(--color-success)';
      case 'refunded':
        return 'var(--color-warning)';
      case 'canceled':
        return 'var(--color-text-secondary)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '900px', padding: '40px 20px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading bounty...</p>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
            Bounty not found
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = bounty.deadline < Math.floor(Date.now() / 1000);

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="animate-fade-in-up" style={{ marginBottom: '32px' }}>
        <Link 
          href="/dashboard"
          style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            marginBottom: '16px',
            display: 'inline-block'
          }}
        >
          ← Back to Dashboard
        </Link>
        <h1 style={{ 
          fontSize: 'clamp(28px, 5vw, 40px)',
          marginBottom: '12px',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em'
        }}>
          Bounty Details
        </h1>
      </div>

      <div className="card animate-fade-in-up delay-100">
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <h2 style={{ 
              fontSize: '24px', 
              margin: 0,
              fontFamily: "'Space Grotesk', sans-serif"
            }}>
              {bounty.repoFullName} #{bounty.issueNumber}
            </h2>
            <span style={{
              padding: '6px 12px',
              borderRadius: '12px',
              background: `${getStatusColor(bounty.status)}15`,
              color: getStatusColor(bounty.status),
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {bounty.status}
            </span>
          </div>
          
          <a 
            href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '14px' }}
          >
            View on GitHub →
          </a>
        </div>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '20px',
          background: 'var(--color-background-secondary)',
          borderRadius: '12px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Amount
            </div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-primary)' }}>
              {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Deadline
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: isExpired ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
              {formatDate(bounty.deadline)}
              {isExpired && ' (Expired)'}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Network
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {bounty.network === 'MEZO_TESTNET' ? 'Mezo Testnet' : 'Base Sepolia'}
            </div>
          </div>
        </div>

        {bounty.txHash && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Transaction Hash
            </div>
            <a
              href={bounty.network === 'MEZO_TESTNET' 
                ? `https://explorer.test.mezo.org/tx/${bounty.txHash}`
                : `https://sepolia.basescan.org/tx/${bounty.txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                wordBreak: 'break-all'
              }}
            >
              {bounty.txHash}
            </a>
          </div>
        )}

        {bounty.status === 'open' && isExpired && (
          <div style={{ marginTop: '24px' }}>
            <Link 
              href={`/refund?bountyId=${bounty.bountyId}`}
              className="btn btn-danger"
              style={{ margin: 0 }}
            >
              Request Refund
            </Link>
          </div>
        )}
      </div>

      {bounty.status === 'open' && (
        <div className="card animate-fade-in-up delay-200">
          <AllowlistManager 
            bountyId={bounty.bountyId}
            initialAllowlist={allowlist}
          />
        </div>
      )}
    </div>
  );
}

