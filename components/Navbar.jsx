'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useNetwork } from '@/components/NetworkProvider';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [githubUser, setGithubUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { networkGroup, switchNetworkGroup, isSwitchingGroup } = useNetwork();
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

  const navLinks = githubUser ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' },
    ...(isAdmin ? [{ href: '/admin/beta', label: 'Admin' }] : [])
  ] : [];

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
          gap: '4px',
          alignItems: 'center'
        }}>
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                color: isActive(link.href) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                background: isActive(link.href) ? 'rgba(0, 130, 123, 0.08)' : 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {link.label}
            </Link>
          ))}
          
          <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 8px' }} />
          
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
          
          {githubUser && (
            <div style={{ width: '1px', height: '24px', background: 'var(--color-border)', margin: '0 8px' }} />
          )}
          
          {!githubUser && (
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
                e.currentTarget.style.background = 'var(--color-primary-medium)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 130, 123, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
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

