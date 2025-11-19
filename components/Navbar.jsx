'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useNetwork } from '@/components/NetworkProvider';
import { useAccount } from 'wagmi';
import UserAvatar from '@/components/UserAvatar';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { networkGroup, switchNetworkGroup, isSwitchingGroup } = useNetwork();
  const { address, isConnected } = useAccount();
  const networkEnv = networkGroup || 'testnet';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/oauth/user', {
        credentials: 'include'
      });
      if (res.ok) {
        const user = await res.json();
        setGithubUser(user);
        
        // Check if user is admin
        const adminRes = await fetch('/api/admin/check');
        if (adminRes.ok) {
          const { isAdmin: adminStatus } = await adminRes.json();
          setIsAdmin(adminStatus);
        }
      }
    } catch (error) {
      // User not logged in
    }
  };

  const handleNetworkSwitch = async () => {
    if (isSwitchingGroup) {
      return;
    }
    const newEnv = networkEnv === 'mainnet' ? 'testnet' : 'mainnet';
    try {
      await switchNetworkGroup(newEnv);
      router.refresh();
    } catch (error) {
      console.error('Error switching network:', error);
      alert(error?.message || `Cannot switch to ${newEnv}: network not configured`);
    }
  };

  const isActive = (path) => pathname === path;

  const handleLogout = async () => {
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

  return (
    <nav style={{
      borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
      background: scrolled ? 'rgba(250, 250, 250, 0.95)' : 'var(--color-background)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(12px)',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '32px'
      }}>
        <Link href="/" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          textDecoration: 'none',
          transition: 'opacity 0.2s'
        }}>
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={32} 
            height={32}
            style={{ borderRadius: '8px' }}
          />
          <span className="text-2xl font-normal" style={{ color: '#00827B' }}>
            BountyPay
          </span>
        </Link>

        <div style={{ 
          display: 'flex', 
          gap: '12px',
          alignItems: 'center'
        }}>
          <button
            onClick={handleNetworkSwitch}
            disabled={isSwitchingGroup}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              fontSize: '13px',
              fontWeight: '500',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              cursor: isSwitchingGroup ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isSwitchingGroup ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSwitchingGroup) {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'rgba(0, 130, 123, 0.04)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.background = 'var(--color-background)';
            }}
            title={`Switch to ${networkEnv === 'mainnet' ? 'testnet' : 'mainnet'}`}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: networkEnv === 'mainnet' ? '#00827B' : '#39BEB7',
              boxShadow: networkEnv === 'mainnet' 
                ? '0 0 8px rgba(0, 130, 123, 0.5)' 
                : '0 0 8px rgba(57, 190, 183, 0.5)'
            }} />
            {networkEnv === 'mainnet' ? 'Mainnet' : 'Testnet'}
          </button>
          
          {githubUser ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={36}
                />
              </button>

              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  minWidth: '240px',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--color-border)'
                  }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: '600',
                      marginBottom: '4px',
                      color: 'var(--color-text-primary)'
                    }}>
                      @{githubUser.githubUsername}
                    </div>
                    {isConnected && address && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--color-text-secondary)',
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '8px' }}>
                    <Link
                      href="/dashboard"
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: isActive('/dashboard') ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        background: isActive('/dashboard') ? 'rgba(0, 130, 123, 0.08)' : 'transparent',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontWeight: isActive('/dashboard') ? '600' : '500'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive('/dashboard')) {
                          e.currentTarget.style.background = 'var(--color-background-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive('/dashboard')) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      Dashboard
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'block',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: isActive('/profile') ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        background: isActive('/profile') ? 'rgba(0, 130, 123, 0.08)' : 'transparent',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        fontWeight: isActive('/profile') ? '600' : '500'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive('/profile')) {
                          e.currentTarget.style.background = 'var(--color-background-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive('/profile')) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      Profile
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin/beta"
                        onClick={() => setShowDropdown(false)}
                        style={{
                          display: 'block',
                          padding: '10px 12px',
                          fontSize: '14px',
                          color: isActive('/admin/beta') ? 'var(--color-primary)' : 'var(--color-text-primary)',
                          background: isActive('/admin/beta') ? 'rgba(0, 130, 123, 0.08)' : 'transparent',
                          textDecoration: 'none',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          fontWeight: isActive('/admin/beta') ? '600' : '500'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive('/admin/beta')) {
                            e.currentTarget.style.background = 'var(--color-background-secondary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive('/admin/beta')) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        Admin
                      </Link>
                    )}
                  </div>

                  <div style={{
                    padding: '8px',
                    borderTop: '1px solid var(--color-border)'
                  }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: 'var(--color-error)',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 50, 0, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent('/')}`;
              }}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                background: 'var(--color-primary)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#39BEB7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-primary)';
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

