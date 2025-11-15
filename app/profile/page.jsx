'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GitHubIcon, WalletIcon, CheckCircleIcon, AlertIcon, SettingsIcon } from '@/components/Icons';
import UserAvatar from '@/components/UserAvatar';
import { useAccount, useWalletClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NETWORKS } from '@/config/networks';

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

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
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

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // With dummy data enabled, use dummy data
      if (useDummyData) {
        setGithubUser({
          githubId: 123456789,
          githubUsername: 'local-dev',
          avatarUrl: null
        });
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
            status: 'resolved',
            paidAt: Date.now()
          }
        ]);
        setTotalEarned(100);
        setLoading(false);
        return;
      }

      // Check auth first
      const authRes = await fetch('/api/oauth/user', {
        credentials: 'include'
      });

      if (!authRes.ok) {
        router.push('/dashboard');
        return;
      }

      const user = await authRes.json();
      setGithubUser(user);

      // Fetch full profile
      const profileRes = await fetch('/api/user/profile', {
        credentials: 'include'
      });

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }

      // Fetch claimed bounties from API
      const claimedRes = await fetch('/api/user/claimed-bounties', {
        credentials: 'include'
      });
      if (claimedRes.ok) {
        const data = await claimedRes.json();
        setClaimedBounties(data.bounties);
        setTotalEarned(data.totalEarned);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  function formatAmount(amount, tokenSymbol) {
    const decimals = tokenSymbol === 'MUSD' ? 18 : 6;
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(0);
  }

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
      // Fetch dummy data if enabled
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
    // GitHub App installation URL
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

      // Refresh profile data
      await fetchProfile();
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

      // Get nonce
      setChangeWalletStatus({ message: 'Getting verification nonce...', type: 'info' });
      const nonceRes = await fetch('/api/nonce', {
        credentials: 'include'
      });

      if (!nonceRes.ok) {
        throw new Error('Failed to get nonce');
      }

      const { nonce } = await nonceRes.json();

      // Create SIWE message
      const message = createSiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to link your wallet to BountyPay',
        uri: window.location.origin,
        version: '1',
        chainId: chain.id,
        nonce: nonce
      });

      // Sign message
      setChangeWalletStatus({ message: 'Please sign the message in your wallet...', type: 'info' });
      const signature = await walletClient.signMessage({
        message: message
      });

      // Verify and link wallet
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
      
      // Refresh profile data
      await fetchProfile();
      
      // Close modal after a short delay
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

  // Auto-link when wallet is connected in change modal
  useEffect(() => {
    if (showChangeWalletModal && githubUser && isConnected && address && walletClient && !isProcessingChange) {
      handleChangeWallet();
    }
  }, [showChangeWalletModal, githubUser, isConnected, address, walletClient]);

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!githubUser || !profile) {
    return null;
  }

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
          Track your claimed bounties and earnings
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px', 
        marginBottom: '32px' 
      }}>
        {/* Total Earned Card */}
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

        {/* Active Claims Card */}
        <div className="card animate-fade-in-up delay-200" style={{ padding: '24px', marginBottom: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            ACTIVE CLAIMS
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
            {claimedBounties.filter(b => b.claimStatus === 'pending').length}
          </div>
        </div>

        {/* Completed Card */}
        <div className="card animate-fade-in-up delay-300" style={{ padding: '24px', marginBottom: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            COMPLETED
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
            {claimedBounties.filter(b => b.claimStatus === 'resolved' || b.claimStatus === 'paid').length}
          </div>
        </div>
      </div>

      {/* Claimed Bounties */}
      <div className="card animate-fade-in-up delay-400" style={{ marginBottom: '24px' }}>
        <h3 style={{ 
          marginBottom: '20px', 
          fontFamily: "'Space Grotesk', sans-serif", 
          fontSize: '18px',
          fontWeight: '600',
          letterSpacing: '-0.01em'
        }}>
          Your Bounties
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

      {/* Account Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card animate-fade-in-up delay-500" style={{ marginBottom: 0, padding: '20px' }}>
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

        <div className="card animate-fade-in-up delay-600" style={{ marginBottom: 0, padding: '20px' }}>
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
                  fontSize: '14px',
                  color: 'var(--color-text-primary)',
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  ⚠️ Important Notice
                </p>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  The new wallet will be used for <strong>all active and future bounty payments</strong>. 
                  Make sure you have access to the new wallet before proceeding.
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
                        e.currentTarget.style.background = 'var(--color-primary-medium)';
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
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                lineHeight: '1.6',
                marginBottom: '12px'
              }}>
                <strong>⚠️ Warning:</strong> Deleting your payout wallet will have the following consequences:
              </p>
              <ul style={{
                fontSize: '13px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.8',
                paddingLeft: '20px',
                margin: 0
              }}>
                <li>You will <strong>not be able to receive payments</strong> for any active bounties</li>
                <li>If any of your PRs are merged, you will <strong>lose the ability to claim those rewards</strong></li>
                <li>You can link a new wallet at any time to restore payout functionality</li>
              </ul>
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

      <div className="card animate-fade-in-up delay-700" style={{ 
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
          Danger Zone
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Logging out will end your session. You can log back in anytime.
        </p>
        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ margin: 0, fontSize: '13px', padding: '10px 20px' }}
        >
          Logout
        </button>
      </div>

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
                  BountyPay isn't installed on any repositories yet.
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

