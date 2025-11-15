'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TargetIcon, PlusIcon } from '@/components/Icons';
import { dummyUserBounties, dummyStats } from '@/dummy-data/dashboard';

export default function Dashboard() {
  const router = useRouter();
  const [githubUser, setGithubUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bounties, setBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const bountiesPerPage = 5;

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (useDummyData) {
        setGithubUser({
          githubId: 123456789,
          githubUsername: 'local-dev',
          avatarUrl: null
        });
        setBounties(dummyUserBounties);
        setStats(dummyStats);
        setHasWallet(true);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (res.ok) {
        const user = await res.json();
        setGithubUser(user);
        await fetchBounties();
        await fetchStats();
        await checkWallet();
      } else {
        // Not logged in, redirect to home
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const checkWallet = async () => {
    try {
      const res = await fetch(`/api/wallet/${githubUser?.githubId || 123456789}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setHasWallet(!!data.walletAddress);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  };

  const fetchBounties = async () => {
    try {
      const res = await fetch('/api/user/bounties', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Ensure data is an array
        const bountiesArray = Array.isArray(data) ? data : [];
        setBounties(bountiesArray);
      } else {
        setBounties([]);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
      setBounties([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/user/stats', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loginWithGitHub = () => {
    const returnUrl = window.location.pathname;
    window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent(returnUrl)}`;
  };

  const handleManage = (bountyId) => {
    router.push(`/dashboard/bounty/${bountyId}`);
  };

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(0);
  }

  function formatTimeLeft(deadline) {
    if (!deadline) return '-';
    
    // deadline is Unix timestamp in seconds, convert to milliseconds
    const deadlineMs = Number(deadline) * 1000;
    const now = Date.now();
    const diff = deadlineMs - now;
    
    if (diff < 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  }

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1400px', padding: '40px 20px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  // Show empty state if user has no bounties and no wallet
  const showEmptyState = bounties.length === 0 && !hasWallet;

  if (!githubUser) {
    return null; // Will redirect in checkAuth
  }

  // Removed: totalContributions and avgDaily calculations (not implemented yet)

  // Sorting function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Sort bounties
  const sortedBounties = [...bounties].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;
    
    if (sortConfig.key === 'bounty') {
      aValue = a.repoFullName.toLowerCase();
      bValue = b.repoFullName.toLowerCase();
    } else if (sortConfig.key === 'status') {
      aValue = a.status;
      bValue = b.status;
    } else if (sortConfig.key === 'amount') {
      aValue = Number(a.amount);
      bValue = Number(b.amount);
    } else if (sortConfig.key === 'timeLeft') {
      // deadline is stored in seconds, convert to milliseconds for comparison
      aValue = a.deadline ? Number(a.deadline) * 1000 : Infinity;
      bValue = b.deadline ? Number(b.deadline) * 1000 : Infinity;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedBounties.length / bountiesPerPage);
  const startIndex = (currentPage - 1) * bountiesPerPage;
  const endIndex = startIndex + bountiesPerPage;
  const displayBounties = sortedBounties.slice(startIndex, endIndex);

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up">
        <h1 style={{ 
          fontSize: 'clamp(22px, 4vw, 28px)',
          marginBottom: '4px',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em',
          fontWeight: '700'
        }}>
          Hello @{githubUser.githubUsername}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {showEmptyState ? 'Get started by funding your first bounty' : "Here's what's happening with your bounties"}
        </p>
      </div>

      {/* Empty State */}
      {showEmptyState && (
        <div className="animate-fade-in-up delay-100" style={{ 
          textAlign: 'center',
          padding: '80px 20px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '16px',
            background: 'rgba(131, 238, 232, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <TargetIcon size={40} color="var(--color-primary)" />
          </div>

          <h2 style={{ 
            fontSize: '28px',
            marginBottom: '12px',
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            Welcome to Your Dashboard
          </h2>
          
          <p style={{ 
            fontSize: '16px', 
            color: 'var(--color-text-secondary)', 
            maxWidth: '500px',
            margin: '0 auto 32px',
            lineHeight: '1.6'
          }}>
            Connect a wallet to fund your first bounty and start attracting contributors to your GitHub issues.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/link-wallet?type=funding">
              <button className="btn btn-primary" style={{ fontSize: '15px', padding: '12px 24px' }}>
                <WalletIcon size={18} />
                Connect Wallet
              </button>
            </Link>
            
            <Link href="/attach-bounty">
              <button 
                className="btn"
                style={{
                  fontSize: '15px',
                  padding: '12px 24px',
                  background: 'white',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              >
                <PlusIcon size={18} />
                Create First Bounty
              </button>
            </Link>
          </div>

          <div style={{
            marginTop: '60px',
            padding: '32px',
            background: 'rgba(131, 238, 232, 0.08)',
            borderRadius: '12px',
            textAlign: 'left'
          }}>
            <h3 style={{ 
              fontSize: '18px',
              marginBottom: '16px',
              fontFamily: "'Space Grotesk', sans-serif"
            }}>
              How it works
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    Connect your funding wallet
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Link a wallet that you'll use to send crypto to bounties
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    Attach a bounty to a GitHub issue
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Choose any issue and fund it with crypto
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ 
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    Payments happen automatically
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    When a PR is merged, funds release to the contributor
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content - Only show if user has bounties or wallet */}
      {!showEmptyState && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: '24px' }}>
        {/* Total Value Locked */}
        <div className="card animate-fade-in-up delay-100" style={{
          marginBottom: 0,
          background: 'linear-gradient(135deg, #00827B 0%, #39BEB7 100%)',
          color: 'white',
          padding: '20px'
        }}>
          <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px' }}>
            VALUE LOCKED
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
            ${stats?.totalValueLocked.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85 }}>
            In {stats?.openBounties || 0} open bounties
          </div>
        </div>

        {/* Total Paid Out */}
        <div className="card animate-fade-in-up delay-200" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            TOTAL PAID
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
            ${stats?.totalValuePaid.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            To {stats?.resolvedBounties || 0} contributors
          </div>
        </div>

        {/* Total Bounties */}
        <div className="card animate-fade-in-up delay-300" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            TOTAL BOUNTIES
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {stats?.totalBounties || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            {stats?.openBounties || 0} open · {stats?.resolvedBounties || 0} resolved
          </div>
        </div>

        {/* Refunded */}
        <div className="card animate-fade-in-up delay-400" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            REFUNDED
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {stats?.refundedBounties || 0}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Expired bounties
          </div>
        </div>
      </div>

      {/* Bounties List - Full Width */}
      <div className="card animate-fade-in-up delay-400" style={{ marginBottom: 0, padding: '24px' }}>
        <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ 
            fontSize: '20px',
            margin: 0,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: '700'
          }}>
            Bounties
          </h2>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-4" style={{ 
          fontSize: '11px', 
          fontWeight: '600', 
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <div 
            className="col-span-5 flex items-center gap-1 cursor-pointer" 
            onClick={() => handleSort('bounty')}
            style={{ userSelect: 'none' }}
          >
            Bounty
            <span style={{ fontSize: '10px', opacity: sortConfig.key === 'bounty' ? 1 : 0.3 }}>
              {sortConfig.key === 'bounty' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-2 flex items-center justify-center gap-1 cursor-pointer"
            onClick={() => handleSort('status')}
            style={{ userSelect: 'none' }}
          >
            Status
            <span style={{ fontSize: '10px', opacity: sortConfig.key === 'status' ? 1 : 0.3 }}>
              {sortConfig.key === 'status' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-3 flex items-center gap-1 cursor-pointer"
            onClick={() => handleSort('timeLeft')}
            style={{ userSelect: 'none' }}
          >
            Time Left
            <span style={{ fontSize: '10px', opacity: sortConfig.key === 'timeLeft' ? 1 : 0.3 }}>
              {sortConfig.key === 'timeLeft' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
          <div 
            className="col-span-2 text-right flex items-center justify-end gap-1 cursor-pointer"
            onClick={() => handleSort('amount')}
            style={{ userSelect: 'none' }}
          >
            Amount
            <span style={{ fontSize: '10px', opacity: sortConfig.key === 'amount' ? 1 : 0.3 }}>
              {sortConfig.key === 'amount' && sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          </div>
        </div>

        {/* Table Rows */}
        <div>
          {bounties.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                No bounties found
              </p>
            </div>
          ) : (
            displayBounties.map((bounty, index) => (
              <div 
                key={bounty.bountyId}
                className="grid grid-cols-12 gap-4 px-4 cursor-pointer items-center transition-colors"
                style={{ 
                  height: '52px',
                  borderBottom: index < displayBounties.length - 1 ? '1px solid var(--color-border)' : 'none'
                }}
                onClick={() => handleManage(bounty.bountyId)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 130, 123, 0.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div className="col-span-5">
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#00827B'
                  }}>
                    {bounty.repoFullName}#{bounty.issueNumber}
                  </div>
                </div>
                <div className="col-span-2 flex justify-center">
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: bounty.status === 'open' 
                      ? 'rgba(0, 130, 123, 0.1)' 
                      : 'rgba(131, 238, 232, 0.2)',
                    color: bounty.status === 'open' 
                      ? '#00827B' 
                      : '#39BEB7'
                  }}>
                    {bounty.status}
                  </span>
                </div>
                <div className="col-span-3">
                  <div style={{ 
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)'
                  }}>
                    {formatTimeLeft(bounty.deadline)}
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#00827B'
                  }}>
                    ${formatAmount(bounty.amount, bounty.tokenSymbol)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {sortedBounties.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, sortedBounties.length)} of {sortedBounties.length}
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: currentPage === 1 ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                ‹
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      border: 'none',
                      background: currentPage === page ? '#00827B' : 'transparent',
                      color: currentPage === page ? 'white' : 'var(--color-text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: currentPage === page ? '600' : '400',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'transparent',
                  color: currentPage === totalPages ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                  fontSize: '12px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
