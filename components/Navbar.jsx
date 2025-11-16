'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/hooks/useAuth';
import { MenuIcon, CloseIcon } from '@/components/Icons';

/**
 * Main navigation bar component with mobile hamburger menu
 * Displays logo, navigation links, and authentication controls
 */
export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { githubUser, loginWithGitHub } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (path) => pathname === path;

  const navLinks = githubUser ? [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/profile', label: 'Profile' }
  ] : [];

  return (
    <nav className={`nav-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={28} 
            height={28}
            className="rounded-md"
          />
          <span>BountyPay</span>
        </Link>

        <div className="nav-links">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          
          {githubUser && <div className="dropdown-divider" />}
          
          {!githubUser && (
            <button onClick={() => loginWithGitHub('/')} className="btn-sm btn-primary">
              Sign In
            </button>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="nav-menu-toggle"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
        </button>
      </div>

      <div className={`nav-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
            className={`nav-link ${isActive(link.href) ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          
          {!githubUser && (
          <button onClick={() => loginWithGitHub('/')} className="btn-primary btn-full">
              Sign In
            </button>
          )}
        </div>
    </nav>
  );
}
