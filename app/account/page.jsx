'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { TargetIcon, PlusIcon, WalletIcon, GitHubIcon, CheckCircleIcon, AlertIcon, SettingsIcon, MoneyIcon } from '@/components/Icons';
import UserAvatar from '@/components/UserAvatar';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { dummyUserBounties, dummyStats } from '@/dummy-data/dashboard';
import AllowlistManager from '@/components/AllowlistManager';

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

export function AccountContent({ initialTab: initialTabOverride } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryTab = searchParams?.get('tab');
  const initialTab = initialTabOverride || queryTab || 'sponsored';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [githubUser, setGithubUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [sponsoredBounties, setSponsoredBounties] = useState([]);
  const [stats, setStats] = useState(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const bountiesPerPage = 4;
  const [expandedBountyId, setExpandedBountyId] = useState(null);
  const [allowlists, setAllowlists] = useState({});
  const [allowlistLoading, setAllowlistLoading] = useState({});
  const [allowlistModalBountyId, setAllowlistModalBountyId] = useState(null);

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
      setSponsoredBounties(dummyUserBounties.map((b) => ({
        ...b,
        claimCount: b.prClaims ? b.prClaims.length : 0
      })));
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

  const fetchAllowlistForBounty = async (bountyId) => {
    if (!bountyId || allowlistLoading[bountyId]) return;
    setAllowlistLoading((prev) => ({ ...prev, [bountyId]: true }));
    try {
      const res = await fetch(`/api/allowlist/${bountyId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setAllowlists((prev) => ({ ...prev, [bountyId]: data }));
      } else {
        setAllowlists((prev) => ({ ...prev, [bountyId]: [] }));
      }
    } catch (error) {
      console.error('Error fetching allowlist:', error);
      setAllowlists((prev) => ({ ...prev, [bountyId]: [] }));
    } finally {
      setAllowlistLoading((prev) => ({ ...prev, [bountyId]: false }));
    }
  };

  const handleToggleBounty = (bountyId) => {
    if (expandedBountyId !== bountyId && !allowlists[bountyId]) {
      fetchAllowlistForBounty(bountyId);
    }
    setExpandedBountyId((prev) => (prev === bountyId ? null : bountyId));
  };
  
  const handleOpenAllowlistModal = async (bountyId) => {
    if (!allowlists[bountyId] && !allowlistLoading[bountyId]) {
      await fetchAllowlistForBounty(bountyId);
    }
    setAllowlistModalBountyId(bountyId);
  };

  const handleCloseAllowlistModal = () => {
    setAllowlistModalBountyId(null);
  };

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(0);
  }

  function formatStatusLabel(status) {
    if (!status) return 'Unknown';
    return status
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function getStatusStyles(status) {
    switch ((status || '').toLowerCase()) {
      case 'open':
        return { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
      case 'in-progress':
        return { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
      case 'resolved':
        return { badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' };
      default:
        return { badge: 'bg-muted text-foreground/70', dot: 'bg-foreground/60' };
    }
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

  function formatDeadlineDate(deadline) {
    if (!deadline) return '-';
    return new Date(Number(deadline) * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const ArrowIcon = ({ direction = 'prev' }) => (
    <svg
      viewBox="0 0 12 12"
      className="w-3 h-3"
      style={direction === 'next' ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M7.5 2.5 L4.5 6 L7.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

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

  const totalPages = Math.max(1, Math.ceil(sortedBounties.length / bountiesPerPage));
  const startIndex = (currentPage - 1) * bountiesPerPage;
  const endIndex = startIndex + bountiesPerPage;
  const displayBounties = sortedBounties.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

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

  const allowlistModalData = allowlistModalBountyId ? (allowlists[allowlistModalBountyId] || []) : [];
  const allowlistModalLoading = allowlistModalBountyId ? allowlistLoading[allowlistModalBountyId] : false;
  const allowlistModalBounty = allowlistModalBountyId
    ? sponsoredBounties.find((b) => b.bountyId === allowlistModalBountyId) || null
    : null;

  return (
    <div className="container" style={{ maxWidth: '1200px', padding: '40px 24px' }}>
      <div className="mb-2 animate-fade-in-up">
        <h1 className="text-foreground" style={{ 
          fontSize: 'clamp(24px, 4vw, 32px)',
          marginBottom: '8px',
          fontWeight: '500',
          letterSpacing: '-0.02em'
        }}>
          Hello @{githubUser.githubUsername}
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: '14px', fontWeight: '300' }}>
          Manage your bounties, earnings, and settings
        </p>
      </div>

      <div className="flex gap-2 mb-8 pb-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="nav-link"
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '500' : '400',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.2s ease',
              borderBottom: activeTab === tab.id ? '2px solid var(--foreground)' : '2px solid transparent',
              borderRadius: '0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'sponsored' && (
        <>
          {showEmptyState ? (
            <div className="min-h-[420px] flex items-center justify-center animate-fade-in-up delay-100">
              <div className="w-full max-w-lg rounded-[36px] border border-border/60 bg-card p-10 text-center shadow-[0_50px_140px_rgba(15,23,42,0.18)] space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <MoneyIcon size={32} color="currentColor" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-light text-foreground/90">Connect Wallet</h2>
                  <p className="text-sm text-muted-foreground">
                    Link a wallet to start funding issues and automating contributor rewards.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/link-wallet?type=funding" className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                    <WalletIcon size={18} />
                    <span className="ml-2">Link Wallet</span>
                  </Link>
                  <Link href="/attach-bounty" className="inline-flex w-full items-center justify-center rounded-full border border-border/70 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary">
                    <PlusIcon size={18} />
                    <span className="ml-2">Learn more about funding</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="stat-card animate-fade-in-up delay-100">
                  <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    VALUE LOCKED
                  </div>
                  <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                    ${stats?.totalValueLocked?.toLocaleString() || '0'}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                    Across {stats?.openBounties || 0} open bounties
                  </div>
                </div>

                <div className="stat-card animate-fade-in-up delay-200">
                  <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    TOTAL PAID
                  </div>
                  <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                    ${stats?.totalValuePaid?.toLocaleString() || '0'}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                    {stats?.resolvedBounties || 0} contributors
                  </div>
                </div>

                <div className="stat-card animate-fade-in-up delay-300">
                  <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    REFUNDED
                  </div>
                  <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                    {stats?.refundedBounties || 0}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                    Expired bounties
                  </div>
                </div>
              </div>

              <div className="animate-fade-in-up delay-400" style={{ marginBottom: 0 }}>
                <div>
                  {sponsoredBounties.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <p className="text-muted-foreground" style={{ fontSize: '14px', fontWeight: '300' }}>
                        No bounties found
                      </p>
                    </div>
                  ) : (
                    <>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pr-4 text-sm text-muted-foreground">
                          <button
                            type="button"
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            aria-label="Previous bounties"
                            className="w-4 h-4 rounded-full bg-muted text-foreground flex items-center justify-center"
                          >
                            <ArrowIcon direction="prev" />
                          </button>
                          <span className="text-sm font-medium">
                            {currentPage}/{totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            aria-label="Next bounties"
                            className="w-4 h-4 rounded-full bg-muted text-foreground flex items-center justify-center"
                          >
                            <ArrowIcon direction="next" />
                          </button>
                        </div>
                      )}
              <div className="space-y-3 mt-1">
                {displayBounties.map((bounty) => {
                  const isExpanded = expandedBountyId === bounty.bountyId;
                  const isExpired = Number(bounty.deadline) < Math.floor(Date.now() / 1000);
                  const allowlistData = allowlists[bounty.bountyId] || [];
                  const isAllowlistLoading = !!allowlistLoading[bounty.bountyId];

                  return (
                      <div 
                        key={bounty.bountyId}
                      className="group bg-card border border-border/40 rounded-[32px] p-6 flex flex-col gap-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md"
                  >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div style={{ flex: '1', minWidth: 0 }}>
                      <button
                        type="button"
                            onClick={() => handleToggleBounty(bounty.bountyId)}
                            aria-expanded={isExpanded}
                            className="text-left cursor-pointer w-full"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left'
                        }}
                      >
                            <div className="flex items-center gap-3">
                    <div
                      className="text-foreground"
                      style={{
                        fontSize: '16px',
                        fontWeight: '300',
                        letterSpacing: '-0.02em',
                        opacity: 0.9,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {bounty.repoFullName}#{bounty.issueNumber}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {isExpanded ? 'Hide details' : 'Show details'}
                              </span>
                    </div>
                          </button>
                      <div className="text-muted-foreground mt-1" style={{ fontSize: '13px', fontWeight: '300' }}>
                        {formatTimeLeft(bounty.deadline) === 'Expired' ? 'Expired' : `${formatTimeLeft(bounty.deadline)} left`}
                      </div>
                      </div>
                    
                    <div className="ml-auto flex flex-col items-end gap-1">
                      <div className="text-foreground" style={{ fontSize: '16px', fontWeight: '300', letterSpacing: '-0.03em', color: '#0D473F' }}>
                        {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground" style={{ fontSize: '12px', fontWeight: '300' }}>
                          {(bounty.claimCount || 0).toString()} claims
                        </span>
                      </div>
                    </div>
                      </div>

                      {isExpanded && (
                      <div className="rounded-[28px] border border-border/50 bg-muted/40 p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
                          <a
                            href={`https://github.com/${bounty.repoFullName}/issues/${bounty.issueNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-light tracking-tight text-primary hover:text-primary/80 transition-colors"
                          >
                            View on GitHub ↗
                          </a>
                        </div>

                          <div className="space-y-3 text-sm font-light text-foreground/80">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground/80">Deadline</span>
                              <span className="text-foreground">
                                {formatDeadlineDate(bounty.deadline)} {isExpired ? '(Expired)' : ''}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground/80">Network</span>
                              <span className="text-foreground">
                                {bounty.network === 'MEZO_TESTNET' ? 'Mezo Testnet' : 'Base Sepolia'}
                              </span>
                            </div>
                            {bounty.txHash && (
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <span className="text-muted-foreground/80 text-sm text-left">Transaction</span>
                                <div className="text-right">
                                  <a
                                    href={
                                      bounty.network === 'MEZO_TESTNET'
                                        ? `https://explorer.test.mezo.org/tx/${bounty.txHash}`
                                        : `https://sepolia.basescan.org/tx/${bounty.txHash}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs break-all text-foreground/90 hover:text-primary inline-block text-right"
                                  >
                                    {bounty.txHash}
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>

                          {bounty.status === 'open' && isExpired && (
                            <Link
                              href={`/refund?bountyId=${bounty.bountyId}`}
                              className="inline-flex items-center justify-center rounded-full border border-border/70 px-4 py-2 text-xs font-medium text-destructive/80 hover:border-destructive/60 hover:text-destructive transition-colors"
                            >
                              Request Refund
                            </Link>
                          )}

                          {bounty.status === 'open' && (
                            <div className="rounded-2xl border border-border/60 bg-white/40 p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground/80 mb-1">
                                    Allowlist
                                  </div>
                                  <div className="text-sm font-light">
                                    {isAllowlistLoading && !allowlistData.length
                                      ? 'Loading allowlist…'
                                      : allowlistData.length > 0
                                        ? `${allowlistData.length} address${allowlistData.length === 1 ? '' : 'es'}`
                                        : 'Open to anyone'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAllowlistModal(bounty.bountyId)}
                                  className="text-xs font-medium text-foreground/80 hover:text-primary transition-colors"
                                >
                                  Manage
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
                  </div>
                    </>
                )}
          </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'earnings' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="stat-card animate-fade-in-up delay-100">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TOTAL EARNED
              </div>
              <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                ${totalEarned.toLocaleString()}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                {claimedBounties.filter(b => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length} bounties
              </div>
            </div>

            <div className="stat-card animate-fade-in-up delay-200">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ACTIVE CLAIMS
              </div>
              <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                {claimedBounties.filter(b => b.claimStatus === 'pending').length}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                Awaiting payout
              </div>
            </div>

            <div className="stat-card animate-fade-in-up delay-300">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                COMPLETED
              </div>
              <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                {claimedBounties.filter(b => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length}
              </div>
              <div className="text-muted-foreground" style={{ fontSize: '13px', marginTop: '4px', fontWeight: '300' }}>
                Paid submissions
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-700">
            <h3 className="text-foreground mb-6" style={{ fontSize: '18px', fontWeight: '400' }}>
              Recent Activity
            </h3>
            <div className="border-t border-border/40 mb-3" />
            
            {claimedBounties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p className="text-muted-foreground" style={{ fontSize: '14px', fontWeight: '300', marginBottom: '16px' }}>
                  You haven't claimed any bounties yet
                </p>
                <Link href="/">
                  <button className="premium-btn bg-primary text-primary-foreground">
                    Browse Bounties
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {claimedBounties.slice(0, 5).map((bounty) => {
                  const repoName = bounty.repoFullName;
                  const issueUrl = `https://github.com/${repoName}/issues/${bounty.issueNumber}`;
                  return (
                  <div 
                    key={bounty.bountyId}
                      className="flex items-center justify-between py-3 border-b border-border/40 last:border-0"
                    >
                      <div>
                        <a
                          href={issueUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foreground hover:text-primary transition-colors"
                          style={{
                            fontSize: '14px',
                            fontWeight: '300',
                            letterSpacing: '-0.02em',
                            marginBottom: '4px',
                            display: 'inline-block',
                            opacity: 0.9
                          }}
                        >
                          {repoName}
                        </a>
                        <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300' }}>
                          {bounty.paidAt ? `Paid ${new Date(bounty.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Paid Recent'}
                      </div>
                    </div>
                      <div className="text-foreground" style={{ fontSize: '16px', fontWeight: '300', letterSpacing: '-0.03em', color: '#0D473F' }}>
                        {formatAmount(bounty.amount, bounty.tokenSymbol)} {bounty.tokenSymbol}
                        </div>
                        </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'settings' && profile && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-foreground flex items-center gap-2" style={{ fontSize: '15px', fontWeight: '500', margin: 0 }}>
                  <GitHubIcon size={18} />
                  GitHub Account
                </h3>
                
                <button
                  onClick={handleManageRepos}
                  className="premium-btn text-sm"
                  style={{
                    padding: '6px 12px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-foreground)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <SettingsIcon size={14} />
                  Manage repos
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={48}
                />
                <div>
                  <div className="text-foreground" style={{ fontSize: '15px', fontWeight: '400', marginBottom: '2px' }}>
                    @{githubUser.githubUsername}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300' }}>
                    ID: {githubUser.githubId}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border/40 rounded-2xl p-6 animate-fade-in-up delay-200">
              <h3 className="text-foreground flex items-center gap-2 mb-4" style={{ fontSize: '15px', fontWeight: '500' }}>
                <WalletIcon size={18} />
                Payout Wallet
              </h3>
              
              {profile.wallet ? (
                <div>
                  <div className="text-muted-foreground" style={{ fontSize: '12px', marginBottom: '4px', fontWeight: '400' }}>
                    Address
                  </div>
                  <div className="text-foreground" style={{ 
                    fontSize: '13px', 
                    fontWeight: '400',
                    fontFamily: "'JetBrains Mono', monospace",
                    wordBreak: 'break-all',
                    marginBottom: '8px'
                  }}>
                    {profile.wallet.walletAddress.slice(0, 10)}...{profile.wallet.walletAddress.slice(-8)}
                  </div>
                  <div className="text-muted-foreground" style={{ fontSize: '12px', marginBottom: '16px', fontWeight: '300' }}>
                    Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={openChangeWalletModal}
                      className="premium-btn text-sm"
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--foreground)'
                      }}
                    >
                      Change Wallet
                    </button>
                    <button 
                      onClick={openDeleteWalletModal}
                      className="premium-btn text-sm"
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid var(--destructive)',
                        color: 'var(--destructive)'
                      }}
                    >
                      Delete Wallet
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-3" style={{ fontSize: '13px', fontWeight: '300' }}>
                    No wallet linked
                  </p>
                  <Link href="/link-wallet?type=payout">
                    <button className="premium-btn bg-primary text-primary-foreground text-sm">
                      Link Wallet
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-destructive/30 rounded-2xl p-6 animate-fade-in-up delay-300" style={{ background: 'var(--destructive)/5' }}>
            <h3 className="text-destructive mb-2" style={{ fontSize: '15px', fontWeight: '500' }}>
              Logout
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: '13px', fontWeight: '300' }}>
              End your session and sign out of your account
            </p>
            <button
              onClick={logout}
              className="premium-btn bg-destructive text-destructive-foreground"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              Logout
            </button>
          </div>
        </>
      )}

      {activeTab === 'admin' && isAdmin && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="stat-card animate-fade-in-up delay-100">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Total Applications
              </div>
              <div className="text-foreground" style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em' }}>
                {betaApplications.length}
              </div>
            </div>
            <div className="stat-card animate-fade-in-up delay-200">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Pending Review
              </div>
              <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: '#FFA500' }}>
                {betaApplications.filter(app => app.status === 'pending').length}
              </div>
            </div>
            <div className="stat-card animate-fade-in-up delay-300">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Approved
              </div>
              <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: 'var(--primary)' }}>
                {betaApplications.filter(app => app.status === 'approved').length}
              </div>
            </div>
            <div className="stat-card animate-fade-in-up delay-400">
              <div className="text-muted-foreground" style={{ fontSize: '11px', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Rejected
              </div>
              <div style={{ fontSize: '32px', fontWeight: '400', letterSpacing: '-0.02em', color: 'var(--destructive)' }}>
                {betaApplications.filter(app => app.status === 'rejected').length}
              </div>
            </div>
          </div>

          {betaApplications.filter(app => app.status === 'pending').length > 0 && (
            <div className="mb-8">
              <h2 className="text-foreground mb-4" style={{ fontSize: '18px', fontWeight: '400' }}>
                Pending Applications
              </h2>
              <div className="space-y-3">
                {betaApplications.filter(app => app.status === 'pending').map(app => (
                  <div
                    key={app.id}
                    className="bg-card border border-border/40 rounded-2xl p-5 flex justify-between items-center gap-5"
                  >
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-3 mb-2">
                        <a
                          href={`https://github.com/${app.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          style={{ fontSize: '16px', fontWeight: '400', textDecoration: 'none' }}
                        >
                          @{app.githubUsername}
                        </a>
                        <span className="bounty-tag" style={{ background: 'rgba(255, 165, 0, 0.1)', color: '#FFA500', fontSize: '11px' }}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300' }}>
                        Applied: {formatDate(app.appliedAt)}
                      </div>
                      {app.email && (
                        <div className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: '300', marginTop: '2px' }}>
                          Email: {app.email}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReview(app.id, 'approve')}
                        disabled={processing[app.id]}
                        className="premium-btn bg-primary text-primary-foreground"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReview(app.id, 'reject')}
                        disabled={processing[app.id]}
                        className="premium-btn"
                        style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
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
          className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
          onClick={() => !isProcessingChange && setShowChangeWalletModal(false)}
        >
          <div 
            className="bg-card rounded-2xl max-w-md w-full p-8 shadow-lg relative border border-border/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
              <WalletIcon size={28} color="var(--accent)" />
            </div>

            <h2 className="text-foreground text-center mb-3" style={{ fontSize: '20px', fontWeight: '500' }}>
              Change Payout Wallet
            </h2>

            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertIcon size={20} color="var(--accent)" />
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, fontWeight: '300' }}>
                  The new wallet will be used for <strong>all active and future bounty payments</strong>
                </p>
            </div>

            {changeWalletStatus.message && (
              <div className={`rounded-xl p-3 mb-5 text-center ${
                changeWalletStatus.type === 'success' ? 'bg-primary/10 border border-primary/30 text-primary' :
                changeWalletStatus.type === 'error' ? 'bg-destructive/10 border border-destructive/30 text-destructive' :
                'bg-accent/10 border border-accent/30 text-accent'
              }`} style={{ fontSize: '13px', fontWeight: '400' }}>
                {changeWalletStatus.message}
              </div>
            )}

            <div className="mb-5">
              <p className="text-muted-foreground mb-3" style={{ fontSize: '13px', fontWeight: '400' }}>
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
                    className="premium-btn w-full bg-primary text-primary-foreground flex items-center justify-center gap-2"
                    style={{ padding: '12px', fontSize: '14px' }}
                  >
                    <WalletIcon size={18} />
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
              className="premium-btn w-full"
              style={{
                padding: '10px',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontSize: '14px',
                opacity: isProcessingChange ? 0.5 : 1
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
          className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
          onClick={() => setShowDeleteWalletModal(false)}
        >
          <div 
            className="bg-card rounded-2xl max-w-md w-full p-8 shadow-lg relative border border-destructive/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <AlertIcon size={28} color="var(--destructive)" />
            </div>

            <h2 className="text-destructive text-center mb-3" style={{ fontSize: '20px', fontWeight: '500' }}>
              Delete Payout Wallet
            </h2>

            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-5">
              <p className="text-muted-foreground" style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, fontWeight: '300' }}>
                <strong>⚠️ Warning:</strong> You will not be able to receive payments for any active bounties
              </p>
            </div>

            <p className="text-muted-foreground mb-2" style={{ fontSize: '13px', fontWeight: '400' }}>
              Type <span className="bg-muted px-2 py-0.5 rounded" style={{ fontFamily: "'JetBrains Mono', monospace" }}>I want to remove my wallet</span> to confirm:
            </p>

            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => {
                setDeleteConfirmation(e.target.value);
                setDeleteError('');
              }}
              placeholder="I want to remove my wallet"
              className="w-full rounded-xl border px-3 py-2"
              style={{
                fontSize: '14px',
                fontFamily: "'JetBrains Mono', monospace",
                borderColor: deleteError ? 'var(--destructive)' : 'var(--border)',
                marginBottom: deleteError ? '8px' : '20px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDeleteWallet();
                }
              }}
            />

            {deleteError && (
              <p className="text-destructive mb-4" style={{ fontSize: '13px', marginTop: '-12px' }}>
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteWalletModal(false);
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
                disabled={deleteLoading}
                className="premium-btn flex-1"
                style={{
                  padding: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                  fontSize: '14px',
                  opacity: deleteLoading ? 0.5 : 1
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleDeleteWallet}
                disabled={deleteLoading || deleteConfirmation.toLowerCase() !== 'i want to remove my wallet'}
                className="premium-btn bg-destructive text-destructive-foreground flex-1"
                style={{
                  padding: '10px',
                  fontSize: '14px',
                  opacity: (deleteLoading || deleteConfirmation.toLowerCase() !== 'i want to remove my wallet') ? 0.5 : 1
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
          className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
          onClick={() => setShowManageReposModal(false)}
        >
          <div 
            className="bg-card rounded-2xl max-w-2xl w-full p-8 shadow-lg relative border border-border/40"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-foreground" style={{ fontSize: '20px', fontWeight: '500', margin: 0 }}>
                Manage Repositories
              </h2>
              
              <button
                onClick={() => setShowManageReposModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {loadingRepos ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground" style={{ fontWeight: '300' }}>Loading repositories...</p>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <GitHubIcon size={32} color="var(--primary)" />
                </div>
                <p className="text-muted-foreground mb-6" style={{ fontSize: '14px', fontWeight: '300' }}>
                  BountyPay isn't installed on any repositories yet
                </p>
                <button
                  onClick={handleInstallApp}
                  className="premium-btn bg-primary text-primary-foreground"
                  style={{ fontSize: '14px', padding: '10px 24px' }}
                >
                  Install on a repository
                </button>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground mb-5" style={{ fontSize: '14px', lineHeight: '1.6', fontWeight: '300' }}>
                  BountyPay is installed on the following repositories:
                </p>
                
                <div className="space-y-2 mb-6">
                  {repositories.map((repo) => (
                    <div
                      key={repo.id}
                      className="px-4 py-3 border border-border/40 rounded-xl bg-muted/30 flex items-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <GitHubIcon size={18} color="var(--muted-foreground)" />
                      <span className="text-foreground" style={{ fontSize: '14px', fontWeight: '400' }}>
                        {repo.fullName}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleInstallApp}
                  className="premium-btn bg-primary text-primary-foreground w-full"
                  style={{ fontSize: '14px', padding: '10px' }}
                >
                  Add / import repository
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Allowlist Modal */}
      {allowlistModalBountyId && (
        <div 
          className="fixed inset-0 bg-background/70 backdrop-blur-md flex items-center justify-center p-5 z-[9999]"
          onClick={handleCloseAllowlistModal}
        >
          <div
            className="bg-card rounded-2xl max-w-2xl w-full p-8 shadow-lg relative border border-border/40"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground/80 mb-2">
                  Allowlist
                </p>
                <h2 className="text-foreground text-xl font-light tracking-tight">
                  Manage Access
                </h2>
                {allowlistModalBounty && (
                  <p className="text-sm text-muted-foreground/80 mt-1 font-light">
                    {allowlistModalBounty.repoFullName}#{allowlistModalBounty.issueNumber}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseAllowlistModal}
                className="text-2xl leading-none text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'none', border: 'none' }}
                aria-label="Close allowlist modal"
              >
                ×
              </button>
            </div>
            {allowlistModalLoading && !allowlistModalData.length ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Loading allowlist…
              </div>
            ) : (
              <AllowlistManager
                bountyId={allowlistModalBountyId}
                initialAllowlist={allowlistModalData}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Account() {
  return (
    <Suspense fallback={
      <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}

