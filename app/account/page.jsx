'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { TargetIcon, PlusIcon, WalletIcon, GitHubIcon, CheckCircleIcon, AlertIcon, SettingsIcon } from '@/components/Icons';
import UserAvatar from '@/components/UserAvatar';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { dummyUserBounties, dummyStats } from '@/dummy-data/dashboard';

function createSiweMessage({ domain, address, statement, uri, version, chainId, nonce }) {
  const message = [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: ${version}`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`
  ].join('\n');

  return message;
}

export default function Account() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'sponsored';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [githubUser, setGithubUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [sponsoredBounties, setSponsoredBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const bountiesPerPage = 5;

  const [profile, setProfile] = useState(null);
  const [claimedBounties, setClaimedBounties] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);
  
  const [showDeleteWalletModal, setShowDeleteWalletModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showChangeWalletModal, setShowChangeWalletModal] = useState(false);
  const [changeWalletStatus, setChangeWalletStatus] = useState({ message: '', type: '' });
  const [isProcessingChange, setIsProcessingChange] = useState(false);
  const [showManageReposModal, setShowManageReposModal] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const [betaApplications, setBetaApplications] = useState([]);
  const [processing, setProcessing] = useState({});

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (githubUser) {
      if (activeTab === 'sponsored') {
        fetchSponsoredData();
      } else if (activeTab === 'earnings') {
        fetchEarningsData();
      } else if (activeTab === 'admin' && isAdmin) {
        fetchAdminData();
      }
    }
  }, [activeTab, githubUser, isAdmin]);

  const checkAuth = async () => {
    try {
      if (useDummyData) {
        setGithubUser({
          githubId: 123456789,
          githubUsername: 'local-dev',
          avatarUrl: null
        });
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (res.ok) {
        const user = await res.json();
        setGithubUser(user);
        
        const adminRes = await fetch('/api/admin/check');
        if (adminRes.ok) {
          const { isAdmin: adminStatus } = await adminRes.json();
          setIsAdmin(adminStatus);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSponsoredData = async () => {
    if (useDummyData) {
      setSponsoredBounties(dummyUserBounties);
      setStats(dummyStats);
      setHasWallet(true);
      return;
    }

    try {
      const [bountiesRes, statsRes, walletRes] = await Promise.all([
        fetch('/api/user/bounties', { credentials: 'include' }),
        fetch('/api/user/stats', { credentials: 'include' }),
        fetch(`/api/wallet/${githubUser.githubId}`, { credentials: 'include' })
      ]);

      if (bountiesRes.ok) {
        const data = await bountiesRes.json();
        setSponsoredBounties(Array.isArray(data) ? data : []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (walletRes.ok) {
        const data = await walletRes.json();
        setHasWallet(!!data.walletAddress);
      }
    } catch (error) {
      console.error('Error fetching sponsored data:', error);
    }
  };

  const fetchEarningsData = async () => {
    if (useDummyData) {
      setProfile({
        user: {
          githubId: 123456789,
          githubUsername: 'local-dev',
          createdAt: Date.now()
        },
        wallet: {
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          verifiedAt: Date.now()
        }
      });
      setClaimedBounties([
        {
          bountyId: '0x123',
          repoFullName: 'test/repo',
          issueNumber: 42,
          amount: '100000000',
          tokenSymbol: 'USDC',
          claimStatus: 'resolved',
          paidAt: Date.now()
        }
      ]);
      setTotalEarned(100);
      return;
    }

    try {
      const [profileRes, claimedRes] = await Promise.all([
        fetch('/api/user/profile', { credentials: 'include' }),
        fetch('/api/user/claimed-bounties', { credentials: 'include' })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }

      if (claimedRes.ok) {
        const data = await claimedRes.json();
        setClaimedBounties(data.bounties);
        setTotalEarned(data.totalEarned);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    }
  };

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/beta/applications');
      if (res.ok) {
        const data = await res.json();
        setBetaApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    }
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const sortedBounties = [...sponsoredBounties].sort((a, b) => {
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
      aValue = a.deadline ? Number(a.deadline) * 1000 : Infinity;
      bValue = b.deadline ? Number(b.deadline) * 1000 : Infinity;
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedBounties.length / bountiesPerPage);
  const startIndex = (currentPage - 1) * bountiesPerPage;
  const endIndex = startIndex + bountiesPerPage;
  const displayBounties = sortedBounties.slice(startIndex, endIndex);

  const logout = async () => {
    try {
      await fetch('/api/oauth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleManageRepos = async () => {
    setShowManageReposModal(true);
    setLoadingRepos(true);
    
    try {
      if (useDummyData) {
        setRepositories([
          { id: 1, name: 'test-repo', fullName: 'test-user/test-repo', owner: 'test-user' },
          { id: 2, name: 'demo-repo', fullName: 'test-user/demo-repo', owner: 'test-user' }
        ]);
        setLoadingRepos(false);
        return;
      }

      const res = await fetch('/api/github/installations', {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setRepositories(data.repositories || []);
      } else {
        setRepositories([]);
      }
    } catch (error) {
      console.error('Error fetching repositories:', error);
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleInstallApp = () => {
    const githubAppInstallUrl = `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'bountypay'}/installations/new`;
    window.open(githubAppInstallUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteWallet = async () => {
    if (deleteConfirmation.toLowerCase() !== 'i want to remove my wallet') {
      setDeleteError('Please type "I want to remove my wallet" to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/wallet/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete wallet');
      }

      await fetchEarningsData();
      setShowDeleteWalletModal(false);
      setDeleteConfirmation('');
    } catch (error) {
      console.error('Error deleting wallet:', error);
      setDeleteError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteWalletModal = () => {
    setShowDeleteWalletModal(true);
    setDeleteConfirmation('');
    setDeleteError('');
  };

  const openChangeWalletModal = () => {
    setShowChangeWalletModal(true);
    setChangeWalletStatus({ message: '', type: '' });
    setIsProcessingChange(false);
  };

  const handleChangeWallet = async () => {
    if (isProcessingChange) {
      return;
    }

    try {
      setIsProcessingChange(true);
      setChangeWalletStatus({ message: 'Connecting...', type: 'info' });

      if (!githubUser && !isLocal) {
        throw new Error('GitHub authentication required');
      }

      if (!address || !isConnected) {
        throw new Error('Please connect your wallet first');
      }

      if (!walletClient) {
        throw new Error('Wallet client not available');
      }

      setChangeWalletStatus({ message: 'Getting verification nonce...', type: 'info' });
      const nonceRes = await fetch('/api/nonce', {
        credentials: 'include'
      });

      if (!nonceRes.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceRes.json();

      const message = createSiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to link your wallet to BountyPay',
        uri: window.location.origin,
        version: '1',
        chainId: chain.id,
        nonce: nonce
      });

      setChangeWalletStatus({ message: 'Please sign the message in your wallet...', type: 'info' });
      const signature = await walletClient.signMessage({
        message: message
      });

      setChangeWalletStatus({ message: 'Verifying signature...', type: 'info' });
      const linkRes = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          address,
          signature,
          message,
          chainId: chain.id
        })
      });

      const linkData = await linkRes.json();

      if (!linkRes.ok) {
        throw new Error(linkData.error || 'Failed to update wallet');
      }

      setChangeWalletStatus({ message: 'Wallet updated successfully!', type: 'success' });
      
      await fetchEarningsData();
      
      setTimeout(() => {
        setShowChangeWalletModal(false);
        setChangeWalletStatus({ message: '', type: '' });
      }, 1500);
    } catch (error) {
      console.error('Error changing wallet:', error);
      setChangeWalletStatus({ message: error.message || 'An error occurred', type: 'error' });
      setIsProcessingChange(false);
    }
  };

  useEffect(() => {
    if (showChangeWalletModal && githubUser && isConnected && address && walletClient && !isProcessingChange) {
      handleChangeWallet();
    }
  }, [showChangeWalletModal, githubUser, isConnected, address, walletClient]);

  const handleReview = async (applicationId, action) => {
    setProcessing({ ...processing, [applicationId]: true });
    
    try {
      const res = await fetch('/api/beta/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ applicationId, action })
      });
      
      if (!res.ok) {
        throw new Error('Failed to review application');
      }
      
      await fetchAdminData();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing({ ...processing, [applicationId]: false });
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#00827B';
      case 'rejected':
        return '#ff3b30';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!githubUser) {
    return null;
  }

  const showEmptyState = sponsoredBounties.length === 0 && !hasWallet && activeTab === 'sponsored';

  const tabs = [
    { id: 'sponsored', label: 'Sponsored' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'settings', label: 'Settings' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : [])
  ];

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
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
          Manage your bounties, earnings, and settings
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '0'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sponsored' && (
        <>
          {showEmptyState ? (
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
                Create Your First Bounty
              </h2>
              
              <p style={{ 
                fontSize: '16px', 
                color: 'var(--color-text-secondary)', 
                maxWidth: '500px',
                margin: '0 auto 32px',
                lineHeight: '1.6'
              }}>
                Fund GitHub issues with crypto and start attracting contributors.
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
                    Create Bounty
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ marginBottom: '24px' }}>
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

              <div className="card animate-fade-in-up delay-400" style={{ marginBottom: 0, padding: '24px' }}>
                <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <h2 style={{ 
                    fontSize: '20px',
                    margin: 0,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: '700'
                  }}>
                    Your Bounties
                  </h2>
                </div>

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

                <div>
                  {sponsoredBounties.length === 0 ? (
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
        </>
      )}

      {activeTab === 'earnings' && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            marginBottom: '32px' 
          }}>
            <div className="card animate-fade-in-up delay-100" style={{ 
              background: 'linear-gradient(135deg, #00827B 0%, #39BEB7 100%)',
              color: 'white',
              padding: '24px',
              marginBottom: 0
            }}>
              <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px' }}>
                TOTAL EARNED
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                ${totalEarned.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.85 }}>
                {claimedBounties.filter(b => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length} bounties
              </div>
            </div>

            <div className="card animate-fade-in-up delay-200" style={{ padding: '24px', marginBottom: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                ACTIVE CLAIMS
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
                {claimedBounties.filter(b => b.claimStatus === 'pending').length}
              </div>
            </div>

            <div className="card animate-fade-in-up delay-300" style={{ padding: '24px', marginBottom: 0 }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                COMPLETED
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
                {claimedBounties.filter(b => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length}
              </div>
            </div>
          </div>

          <div className="card animate-fade-in-up delay-400" style={{ marginBottom: '24px' }}>
            <h3 style={{ 
              marginBottom: '20px', 
              fontFamily: "'Space Grotesk', sans-serif", 
              fontSize: '18px',
              fontWeight: '600',
              letterSpacing: '-0.01em'
            }}>
              Claimed Bounties
            </h3>
            
            {claimedBounties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  You haven't claimed any bounties yet
                </p>
                <Link href="/">
                  <button className="btn btn-primary">
                    Browse Bounties
                  </button>
                </Link>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {claimedBounties.map((bounty) => (
                  <div 
                    key={bounty.bountyId}
                    style={{
                      padding: '14px 16px',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-background-secondary)';
                      e.currentTarget.style.borderColor = 'var(--color-primary-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: 'var(--color-primary)', 
                          marginBottom: '2px',
                          display: 'block',
                          textDecoration: 'none',
                          transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.7';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {bounty.repoFullName}#{bounty.issueNumber}
                      </a>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {(bounty.claimStatus === 'resolved' || bounty.claimStatus === 'paid') ? `Paid ${new Date(bounty.paidAt).toLocaleDateString()}` : 'In Progress'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          ${formatAmount(bounty.amount, bounty.tokenSymbol)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {bounty.tokenSymbol}
                        </div>
                      </div>
                      {(bounty.claimStatus === 'resolved' || bounty.claimStatus === 'paid') && (
                        <CheckCircleIcon size={20} color="var(--color-primary)" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'settings' && profile && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card animate-fade-in-up delay-100" style={{ marginBottom: 0, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Space Grotesk', sans-serif",
                  letterSpacing: '-0.01em',
                  margin: 0
                }}>
                  <GitHubIcon size={18} color="var(--color-primary)" />
                  GitHub Account
                </h3>
                
                <button
                  onClick={handleManageRepos}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'white',
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-background-secondary)';
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }}
                >
                  <SettingsIcon size={14} />
                  Manage repos
                </button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={48}
                />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                    @{githubUser.githubUsername}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    ID: {githubUser.githubId}
                  </div>
                </div>
              </div>
            </div>

            <div className="card animate-fade-in-up delay-200" style={{ marginBottom: 0, padding: '20px' }}>
              <h3 style={{ 
                marginBottom: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '14px',
                fontWeight: '600',
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: '-0.01em'
              }}>
                <WalletIcon size={18} color="var(--color-primary)" />
                Payout Wallet
              </h3>
              
              {profile.wallet ? (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                    Address
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '500',
                    fontFamily: "'JetBrains Mono', monospace",
                    wordBreak: 'break-all',
                    marginBottom: '8px'
                  }}>
                    {profile.wallet.walletAddress.slice(0, 10)}...{profile.wallet.walletAddress.slice(-8)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                    Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={openChangeWalletModal}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        background: 'white',
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-background-secondary)';
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                      }}
                    >
                      Change Wallet
                    </button>
                    <button 
                      onClick={openDeleteWalletModal}
                      style={{
                        fontSize: '12px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 50, 0, 0.3)',
                        background: 'white',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 50, 0, 0.05)';
                        e.currentTarget.style.borderColor = 'var(--color-error)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = 'rgba(255, 50, 0, 0.3)';
                      }}
                    >
                      Delete Wallet
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
                    No wallet linked
                  </p>
                  <Link href="/link-wallet?type=payout">
                    <button 
                      className="btn"
                      style={{
                        fontSize: '13px',
                        padding: '8px 16px',
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      Link Wallet
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="card animate-fade-in-up delay-300" style={{ 
            borderColor: 'rgba(255, 50, 0, 0.15)',
            background: 'rgba(255, 50, 0, 0.02)',
            padding: '20px'
          }}>
            <h3 style={{ 
              marginBottom: '8px', 
              color: 'var(--color-error)',
              fontSize: '14px',
              fontWeight: '600',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.01em'
            }}>
              Logout
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              End your session and sign out of your account
            </p>
            <button
              onClick={logout}
              className="btn btn-danger"
              style={{ margin: 0, fontSize: '13px', padding: '10px 20px' }}
            >
              Logout
            </button>
          </div>
        </>
      )}

      {activeTab === 'admin' && isAdmin && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}>
            <div style={{
              padding: '20px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Total Applications
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: 'var(--color-text)' }}>
                {betaApplications.length}
              </div>
            </div>
            <div style={{
              padding: '20px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Pending Review
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#FFA500' }}>
                {betaApplications.filter(app => app.status === 'pending').length}
              </div>
            </div>
            <div style={{
              padding: '20px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Approved
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#00827B' }}>
                {betaApplications.filter(app => app.status === 'approved').length}
              </div>
            </div>
            <div style={{
              padding: '20px',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Rejected
              </div>
              <div style={{ fontSize: '32px', fontWeight: '600', color: '#ff3b30' }}>
                {betaApplications.filter(app => app.status === 'rejected').length}
              </div>
            </div>
          </div>

          {betaApplications.filter(app => app.status === 'pending').length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--color-text)',
                marginBottom: '16px',
                fontFamily: "'Space Grotesk', sans-serif"
              }}>
                Pending Applications
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {betaApplications.filter(app => app.status === 'pending').map(app => (
                  <div
                    key={app.id}
                    style={{
                      padding: '20px',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '20px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <a
                          href={`https://github.com/${app.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            color: 'var(--color-primary)',
                            textDecoration: 'none'
                          }}
                        >
                          @{app.githubUsername}
                        </a>
                        <span
                          style={{
                            padding: '4px 10px',
                            background: 'rgba(255, 165, 0, 0.1)',
                            color: '#FFA500',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        Applied: {formatDate(app.appliedAt)}
                      </div>
                      {app.email && (
                        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                          Email: {app.email}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleReview(app.id, 'approve')}
                        disabled={processing[app.id]}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: 'none',
                          background: processing[app.id] ? 'var(--color-background-secondary)' : 'var(--color-primary)',
                          color: processing[app.id] ? 'var(--color-text-secondary)' : 'white',
                          cursor: processing[app.id] ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!processing[app.id]) {
                            e.currentTarget.style.background = 'var(--color-secondary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!processing[app.id]) {
                            e.currentTarget.style.background = 'var(--color-primary)';
                          }
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReview(app.id, 'reject')}
                        disabled={processing[app.id]}
                        style={{
                          padding: '10px 20px',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-background)',
                          color: 'var(--color-text-secondary)',
                          cursor: processing[app.id] ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!processing[app.id]) {
                            e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)';
                            e.currentTarget.style.borderColor = '#ff3b30';
                            e.currentTarget.style.color = '#ff3b30';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!processing[app.id]) {
                            e.currentTarget.style.background = 'var(--color-background)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                            e.currentTarget.style.color = 'var(--color-text-secondary)';
                          }
                        }}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Change Wallet Modal */}
      {showChangeWalletModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => !isProcessingChange && setShowChangeWalletModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 180, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(255, 180, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <WalletIcon size={28} color="var(--color-warning)" />
            </div>

            <h2 style={{
              fontSize: '22px',
              fontFamily: "'Space Grotesk', sans-serif",
              textAlign: 'center',
              marginBottom: '12px',
              color: 'var(--color-text-primary)',
              fontWeight: '600'
            }}>
              Change Payout Wallet
            </h2>

            <div style={{
              background: 'rgba(255, 180, 0, 0.08)',
              border: '1px solid rgba(255, 180, 0, 0.3)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '12px'
            }}>
              <div style={{ flexShrink: 0, marginTop: '2px' }}>
                <AlertIcon size={20} color="var(--color-warning)" />
              </div>
              <div>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  The new wallet will be used for <strong>all active and future bounty payments</strong>
                </p>
              </div>
            </div>

            {changeWalletStatus.message && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                background: changeWalletStatus.type === 'success' 
                  ? 'rgba(0, 130, 123, 0.1)' 
                  : changeWalletStatus.type === 'error'
                  ? 'rgba(255, 50, 0, 0.1)'
                  : 'rgba(0, 138, 255, 0.1)',
                border: `1px solid ${
                  changeWalletStatus.type === 'success' 
                    ? 'rgba(0, 130, 123, 0.3)' 
                    : changeWalletStatus.type === 'error'
                    ? 'rgba(255, 50, 0, 0.3)'
                    : 'rgba(0, 138, 255, 0.3)'
                }`,
                color: changeWalletStatus.type === 'success' 
                  ? 'var(--color-primary)' 
                  : changeWalletStatus.type === 'error'
                  ? 'var(--color-error)'
                  : 'var(--color-accent)',
                fontSize: '13px',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {changeWalletStatus.message}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
                fontWeight: '500'
              }}>
                Connect your new wallet:
              </p>
              
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (openConnectModal) openConnectModal();
                    }}
                    disabled={isProcessingChange || !openConnectModal}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: (isProcessingChange || !openConnectModal) 
                        ? 'var(--color-text-secondary)' 
                        : 'var(--color-primary)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: (isProcessingChange || !openConnectModal) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isProcessingChange && openConnectModal) {
                        e.currentTarget.style.background = 'var(--color-secondary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isProcessingChange && openConnectModal) {
                        e.currentTarget.style.background = 'var(--color-primary)';
                      }
                    }}
                  >
                    <WalletIcon size={18} color="white" />
                    {isConnected ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
                  </button>
                )}
              </ConnectButton.Custom>
            </div>

            <button
              onClick={() => {
                setShowChangeWalletModal(false);
                setChangeWalletStatus({ message: '', type: '' });
              }}
              disabled={isProcessingChange}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'white',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isProcessingChange ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isProcessingChange ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isProcessingChange) {
                  e.currentTarget.style.background = 'var(--color-background-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessingChange) {
                  e.currentTarget.style.background = 'white';
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Wallet Modal */}
      {showDeleteWalletModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowDeleteWalletModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(255, 50, 0, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(255, 50, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertIcon size={28} color="var(--color-error)" />
            </div>

            <h2 style={{
              fontSize: '22px',
              fontFamily: "'Space Grotesk', sans-serif",
              textAlign: 'center',
              marginBottom: '12px',
              color: 'var(--color-error)',
              fontWeight: '600'
            }}>
              Delete Payout Wallet
            </h2>

            <div style={{
              background: 'rgba(255, 50, 0, 0.05)',
              border: '1px solid rgba(255, 50, 0, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.6',
                margin: 0
              }}>
                <strong>⚠️ Warning:</strong> You will not be able to receive payments for any active bounties
              </p>
            </div>

            <p style={{
              fontSize: '13px',
              color: 'var(--color-text-secondary)',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              Type <span style={{ fontFamily: "'JetBrains Mono', monospace", background: 'var(--color-background-secondary)', padding: '2px 6px', borderRadius: '4px' }}>I want to remove my wallet</span> to confirm:
            </p>

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => {
                setDeleteConfirmation(e.target.value);
                setDeleteError('');
              }}
              placeholder="I want to remove my wallet"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: `1px solid ${deleteError ? 'var(--color-error)' : 'var(--color-border)'}`,
                fontSize: '14px',
                marginBottom: deleteError ? '8px' : '20px',
                fontFamily: "'JetBrains Mono', monospace"
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDeleteWallet();
                }
              }}
            />

            {deleteError && (
              <p style={{
                fontSize: '13px',
                color: 'var(--color-error)',
                marginBottom: '16px',
                marginTop: '-12px'
              }}>
                {deleteError}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowDeleteWalletModal(false);
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'white',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: deleteLoading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!deleteLoading) {
                    e.currentTarget.style.background = 'var(--color-background-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleteLoading) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteWallet}
                disabled={deleteLoading || deleteConfirmation.toLowerCase() !== 'i want to remove my wallet'}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (deleteLoading || deleteConfirmation.toLowerCase() !== 'i want to remove my wallet') 
                    ? 'var(--color-text-secondary)' 
                    : 'var(--color-error)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (deleteLoading || deleteConfirmation.toLowerCase() !== 'i want to remove my wallet') 
                    ? 'not-allowed' 
                    : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!deleteLoading && deleteConfirmation.toLowerCase() === 'i want to remove my wallet') {
                    e.currentTarget.style.background = '#CC2800';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!deleteLoading && deleteConfirmation.toLowerCase() === 'i want to remove my wallet') {
                    e.currentTarget.style.background = 'var(--color-error)';
                  }
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Repos Modal */}
      {showManageReposModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowManageReposModal(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '22px',
                fontFamily: "'Space Grotesk', sans-serif",
                color: 'var(--color-text-primary)',
                fontWeight: '600',
                margin: 0
              }}>
                Manage Repositories
              </h2>
              
              <button
                onClick={() => setShowManageReposModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1,
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                ×
              </button>
            </div>

            {loadingRepos ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Loading repositories...</p>
              </div>
            ) : repositories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(131, 238, 232, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <GitHubIcon size={32} color="var(--color-primary)" />
                </div>
                <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                  BountyPay isn't installed on any repositories yet
                </p>
                <button
                  onClick={handleInstallApp}
                  className="btn btn-primary"
                  style={{ fontSize: '14px' }}
                >
                  Install on a repository
                </button>
              </div>
            ) : (
              <>
                <p style={{ 
                  fontSize: '14px', 
                  color: 'var(--color-text-secondary)', 
                  marginBottom: '20px',
                  lineHeight: '1.6'
                }}>
                  BountyPay is installed on the following repositories:
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '8px',
                  marginBottom: '24px'
                }}>
                  {repositories.map((repo) => (
                    <div
                      key={repo.id}
                      style={{
                        padding: '12px 16px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        background: 'var(--color-background)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.background = 'rgba(131, 238, 232, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.background = 'var(--color-background)';
                      }}
                    >
                      <GitHubIcon size={20} color="var(--color-text-secondary)" />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        color: 'var(--color-text-primary)',
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        {repo.fullName}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleInstallApp}
                  className="btn btn-primary btn-full"
                  style={{ fontSize: '14px' }}
                >
                  Add / import repository
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

