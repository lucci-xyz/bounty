'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <nav style={{
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-background)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    }}>
      <div className="container" style={{
        maxWidth: '1200px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        flexWrap: 'wrap'
      }}>
        <Link href="/" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          textDecoration: 'none'
        }}>
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={32} 
            height={32}
            style={{ borderRadius: '6px' }}
          />
          <span style={{ 
            fontSize: '20px', 
            fontWeight: '700',
            color: 'var(--color-text)'
          }}>
            BountyPay
          </span>
        </Link>

        <div style={{ 
          display: 'flex', 
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Link 
            href="/" 
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              color: isActive('/') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: isActive('/') ? 'rgba(0, 130, 123, 0.1)' : 'transparent',
              transition: 'all 0.15s'
            }}
          >
            Bounties
          </Link>
          <Link 
            href="/about" 
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              color: isActive('/about') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: isActive('/about') ? 'rgba(0, 130, 123, 0.1)' : 'transparent',
              transition: 'all 0.15s'
            }}
          >
            About
          </Link>
          <Link 
            href="/attach-bounty" 
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              color: isActive('/attach-bounty') ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              background: isActive('/attach-bounty') ? 'rgba(0, 130, 123, 0.1)' : 'transparent',
              transition: 'all 0.15s'
            }}
          >
            Create Bounty
          </Link>
          <Link 
            href="/link-wallet" 
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '14px'
            }}
          >
            Link Wallet
          </Link>
        </div>
      </div>
    </nav>
  );
}

