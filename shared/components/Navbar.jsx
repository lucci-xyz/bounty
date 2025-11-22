'use client';
import { logger } from '@/shared/lib/logger';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import UserAvatar from '@/shared/components/UserAvatar';
import { useGithubUser } from '@/shared/hooks/useGithubUser';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { networkGroup, switchNetworkGroup, isSwitchingGroup } = useNetwork();
  const networkEnv = networkGroup || 'testnet';
  const { githubUser } = useGithubUser();
  const { showError } = useErrorModal();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const handleNetworkSwitch = async () => {
    if (isSwitchingGroup) {
      return;
    }
    const newEnv = networkEnv === 'mainnet' ? 'testnet' : 'mainnet';
    try {
      await switchNetworkGroup(newEnv);
      router.refresh();
    } catch (error) {
      logger.error('Error switching network:', error);
      showError({
        title: 'Unable to switch network',
        message: error?.message || `Cannot switch to ${newEnv}: network not configured`
      });
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
      logger.error('Logout error:', error);
    }
  };

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-200 ${
      scrolled
        ? 'border-b border-border bg-background/80 shadow-[0_8px_24px_rgba(15,23,42,0.08)]'
        : 'border-b border-transparent bg-background/70 shadow-[0_4px_12px_rgba(15,23,42,0.04)]'
    }`}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
          <span className="text-l font-sm tracking-tight text-primary group-hover:opacity-80 transition-opacity">
            BountyPay
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Post Button */}
          <Link href="/attach-bounty">
            <button className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-normal bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              + Post
            </button>
          </Link>
          
          {/* Connect/User Button */}
          {githubUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-full border-0 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 bg-transparent"
                aria-label="User menu"
              >
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={34}
                  variant="solid"
                  className="shadow-[0_6px_16px_rgba(0,0,0,0.18)] !h-[28px] !w-[28px] sm:!h-[34px] sm:!w-[34px] !border-0 !outline-none"
                />
              </button>

              {showDropdown && (
                <div className="absolute top-full mt-2 right-0 w-64 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-4 border-b border-border">
                    <button
                      onClick={handleNetworkSwitch}
                      disabled={isSwitchingGroup}
                      type="button"
                      className="w-full cursor-pointer rounded-lg border border-border/60 bg-secondary/80 px-2.5 py-1.5 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            networkEnv === 'mainnet' ? 'bg-primary' : 'bg-accent'
                          }`}
                        />
                        {networkEnv === 'mainnet' ? 'Mainnet' : 'Testnet'}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Tap to switch to {networkEnv === 'mainnet' ? 'Testnet' : 'Mainnet'}.
                      </p>
                    </button>
                  </div>

                  <div className="p-2">
                    <Link
                      href="/account?tab=sponsored"
                      onClick={() => setShowDropdown(false)}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors text-foreground hover:bg-secondary ${
                        isActive('/account') ? 'font-medium' : ''
                      }`}
                    >
                      Account
                    </Link>
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
              className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Connect
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

