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
    <nav className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-200 ${
      scrolled ? 'border-b border-border bg-background/80' : 'border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image 
            src="/icons/og.png" 
            alt="BountyPay" 
            width={50} 
            height={50}
            className="rounded-lg"
          />
          {/* <span className="text-xl font-medium tracking-tight text-primary group-hover:opacity-80 transition-opacity">
            BountyPay
          </span> */}
        </Link>

        <div className="flex items-center gap-3">
          {/* Post Button */}
          <Link href="/attach-bounty">
            <button className="px-4 py-2 rounded-lg text-sm font-normal bg-secondary text-foreground hover:bg-muted transition-colors">
              + Post
          </button>
          </Link>
          
          {/* Connect/User Button */}
          {githubUser && isConnected ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={18}
                />
                <span className="font-mono text-xs">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </button>

              {showDropdown && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-border">
                    <div className="text-sm font-medium mb-1">
                      @{githubUser.githubUsername}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        networkEnv === 'mainnet' ? 'bg-primary' : 'bg-accent'
                      }`} />
                      {networkEnv === 'mainnet' ? 'Mainnet' : 'Testnet'}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/account?tab=sponsored"
                      onClick={() => setShowDropdown(false)}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive('/account')
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      Account
                    </Link>
                    <button
                      onClick={handleNetworkSwitch}
                      disabled={isSwitchingGroup}
                      className="w-full px-3 py-2 text-sm text-left rounded-lg text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Switch to {networkEnv === 'mainnet' ? 'Testnet' : 'Mainnet'}
                    </button>
                  </div>

                  <div className="p-2 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-sm text-left rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
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
              className="px-5 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

