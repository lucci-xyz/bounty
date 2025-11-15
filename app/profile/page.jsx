'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GitHubIcon, WalletIcon, CheckCircleIcon } from '@/components/Icons';
import UserAvatar from '@/components/UserAvatar';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [githubUser, setGithubUser] = useState(null);
  const [claimedBounties, setClaimedBounties] = useState([]);
  const [totalEarned, setTotalEarned] = useState(0);

  const isLocal = process.env.NEXT_PUBLIC_ENV_TARGET === 'local';
  const useDummyData = process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      // In local mode or with dummy data enabled, use dummy data
      if (isLocal || useDummyData) {
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

      // TODO: Fetch claimed bounties from API
      // const claimedRes = await fetch('/api/user/claimed-bounties', {
      //   credentials: 'include'
      // });
      // if (claimedRes.ok) {
      //   const data = await claimedRes.json();
      //   setClaimedBounties(data.bounties);
      //   setTotalEarned(data.totalEarned);
      // }
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

  if (loading) {
    return (
      <div className="container" style={{ maxWidth: '800px', padding: '40px 20px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (!githubUser || !profile) {
    return null;
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <div className="animate-fade-in-up" style={{ marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: 'clamp(32px, 6vw, 48px)',
          marginBottom: '8px',
          fontFamily: "'Space Grotesk', sans-serif",
          letterSpacing: '-0.02em'
        }}>
          Contributor Profile
        </h1>
        <p style={{ 
          fontSize: 'clamp(16px, 2.5vw, 18px)', 
          color: 'var(--color-text-secondary)' 
        }}>
          Track your claimed bounties and earnings
        </p>
      </div>

      {/* Earnings Summary */}
      <div className="card animate-fade-in-up delay-100" style={{
        background: 'linear-gradient(135deg, #00827B 0%, #39BEB7 100%)',
        color: 'white',
        padding: '32px',
        marginBottom: '24px'
      }}>
        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px', fontWeight: '500', letterSpacing: '0.5px' }}>
          TOTAL EARNED
        </div>
        <div style={{ fontSize: '48px', fontWeight: '700', marginBottom: '8px' }}>
          ${totalEarned.toLocaleString()}
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9' }}>
          {claimedBounties.filter(b => b.status === 'resolved').length} bounties completed
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Active Claims Card */}
        <div className="card animate-fade-in-up delay-200" style={{ marginBottom: 0 }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
              {claimedBounties.filter(b => b.status === 'pending').length}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Active Claims
            </div>
          </div>
        </div>

        {/* Completed Card */}
        <div className="card animate-fade-in-up delay-300" style={{ marginBottom: 0 }}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#22C55E', marginBottom: '4px' }}>
              {claimedBounties.filter(b => b.status === 'resolved').length}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Completed
            </div>
          </div>
        </div>
      </div>

      {/* Claimed Bounties */}
      <div className="card animate-fade-in-up delay-400" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontFamily: "'Space Grotesk', sans-serif", fontSize: '20px' }}>
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
          <div style={{ display: 'grid', gap: '12px' }}>
            {claimedBounties.map((bounty) => (
              <div 
                key={bounty.bountyId}
                style={{
                  padding: '16px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-primary)', marginBottom: '4px' }}>
                    {bounty.repoFullName}#{bounty.issueNumber}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                    {bounty.status === 'resolved' ? `Paid ${new Date(bounty.paidAt).toLocaleDateString()}` : 'In Progress'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      ${formatAmount(bounty.amount, bounty.tokenSymbol)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      {bounty.tokenSymbol}
                    </div>
                  </div>
                  {bounty.status === 'resolved' && (
                    <CheckCircleIcon size={24} color="#22C55E" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card animate-fade-in-up delay-500" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px' }}>
            <GitHubIcon size={20} color="var(--color-primary)" />
            GitHub Account
          </h3>
          
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

        <div className="card animate-fade-in-up delay-600" style={{ marginBottom: 0 }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px' }}>
            <WalletIcon size={20} color="var(--color-primary)" />
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
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Linked {new Date(profile.wallet.verifiedAt).toLocaleDateString()}
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
        borderColor: 'rgba(255, 50, 0, 0.2)',
        background: 'rgba(255, 50, 0, 0.02)'
      }}>
        <h3 style={{ marginBottom: '12px', color: 'var(--color-error)' }}>Danger Zone</h3>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
          Logging out will end your session. You can log back in anytime.
        </p>
        <button
          onClick={logout}
          className="btn btn-danger"
          style={{ margin: 0 }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

