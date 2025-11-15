'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TargetIcon, PlusIcon, WalletIcon } from '@/components/Icons';
import { dummyUserBounties, dummyStats, dummyTopContributors, dummyWalletBalance, dummyContributionsData } from '@/dummy-data/dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Dashboard() {
  const router = useRouter();
  const [githubUser, setGithubUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bounties, setBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
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
        setContributors(dummyTopContributors);
        setWalletBalance(dummyWalletBalance);
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
    
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    
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

  const totalContributions = dummyContributionsData.reduce((sum, d) => sum + d.value, 0);
  const avgDaily = totalContributions / 30;

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
      aValue = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      bValue = b.deadline ? new Date(b.deadline).getTime() : Infinity;
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
          Hello, @{githubUser.githubUsername}
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
      {/* Top Row - Wallet + Contributions + Top Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginBottom: '24px' }}>
        {/* Virtual Wallet Card */}
        <div className="card animate-fade-in-up delay-100" style={{
          marginBottom: 0,
          background: 'linear-gradient(135deg, #00827B 0%, #39BEB7 100%)',
          color: 'white',
          padding: '28px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '20px', fontWeight: '500', letterSpacing: '0.5px' }}>
              PROJECT WALLET
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>Total Balance</div>
              <div style={{ fontSize: '32px', fontWeight: '700' }}>
                ${walletBalance?.totalUsdValue.toLocaleString() || '0'}
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {walletBalance?.balances.map((bal, idx) => (
                <div key={idx} style={{ 
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <div style={{ fontSize: '10px', opacity: 0.9, marginBottom: '2px' }}>{bal.token}</div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>${bal.usdValue.toLocaleString()}</div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.5px'
            }}>
              {walletBalance?.address.slice(0, 14)}...{walletBalance?.address.slice(-10)}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            filter: 'blur(40px)'
          }} />
        </div>

        {/* Contributions Chart */}
        <div className="card animate-fade-in-up delay-200" style={{ marginBottom: 0, padding: '24px' }}>
          <div className="mb-4">
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: '500' }}>
              Contributions
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              +{totalContributions.toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#00827B', fontWeight: '500' }}>
              +180.1% from last month
            </div>
          </div>
          
          <div 
            style={{ 
              outline: 'none',
              userSelect: 'none'
            }} 
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
          >
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart 
                data={dummyContributionsData}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#63BBB6" stopOpacity={0.7}/>
                    <stop offset="50%" stopColor="#63BBB6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#63BBB6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#63BBB6" 
                  strokeWidth={2}
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* Top Contributors */}
        <div className="card animate-fade-in-up delay-300" style={{ marginBottom: 0, padding: '24px' }}>
            <h3 style={{ 
              fontSize: '16px',
              marginBottom: '20px',
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: '700'
            }}>
              Top Contributors
            </h3>
            
            <div>
              {contributors.map((contributor, idx) => (
                <div key={idx} className="flex items-center justify-between" style={{ marginBottom: idx < contributors.length - 1 ? '24px' : '0' }}>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={contributor.avatarUrl} alt={contributor.username} />
                      <AvatarFallback>{contributor.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                        {contributor.username}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        ${contributor.totalEarned.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://github.com/${contributor.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: 'transparent',
                      color: 'var(--color-text-secondary)',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-background-secondary)';
                      e.currentTarget.style.color = '#00827B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                </div>
              ))}
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
          <div className="col-span-3">Time Left</div>
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
