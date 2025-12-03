'use client';
import { logger } from '@/shared/lib/logger';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useNetwork } from '@/shared/providers/NetworkProvider';
import UserAvatar from '@/shared/components/UserAvatar';
import { useGithubUser } from '@/shared/hooks/useGithubUser';
import { useErrorModal } from '@/shared/providers/ErrorModalProvider';
import { cn } from '@/shared/lib';

// Icons for dropdown menu
function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

function NetworkIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}

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

  // Detect if user is in the app vs landing page
  const isAppRoute = pathname?.startsWith('/app');

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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className={cn(
        'max-w-3xl mx-auto flex items-center justify-between px-4 py-2 rounded-full border transition-all duration-300',
        scrolled
          ? 'bg-card/95 backdrop-blur-custom border-border shadow-sm'
          : 'bg-card/80 backdrop-blur-sm border-border/80'
      )}>
        {/* Logo - links to app if in app, otherwise landing */}
        <Link href={isAppRoute ? "/app" : "/"} className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-semibold tracking-tight text-foreground">
            BountyPay
          </span>
        </Link>

        {/* Center Navigation - Only show on landing page */}
        {!isAppRoute && (
          <div className="hidden md:flex items-center gap-5">
            <Link 
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
            </Link>
            <Link 
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {githubUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center justify-center w-8 h-8 rounded-full border-0 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring bg-transparent"
                aria-label="User menu"
              >
                <UserAvatar 
                  username={githubUser.githubUsername}
                  avatarUrl={githubUser.avatarUrl}
                  size={32}
                  variant="solid"
                  className="!border-0 !outline-none !w-8 !h-8"
                />
              </button>

              {showDropdown && (
                <div className="absolute top-full mt-2 right-0 w-44 bg-card/95 backdrop-blur-xl border border-border/60 rounded-xl shadow-lg overflow-hidden z-50">
                  {/* Network Switcher */}
                  <div className="p-1.5 border-b border-border/40">
                    <button
                      onClick={handleNetworkSwitch}
                      disabled={isSwitchingGroup}
                      type="button"
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          networkEnv === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-500'
                        )}
                      />
                      <span className="text-xs text-foreground">
                        {networkEnv === 'mainnet' ? 'Mainnet' : 'Testnet'}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto">switch</span>
                    </button>
                  </div>

                  {/* Navigation Links */}
                  <div className="p-1.5">
                    <Link
                      href="/app/attach-bounty"
                      onClick={() => setShowDropdown(false)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-secondary',
                        pathname?.startsWith('/app/attach-bounty') ? 'bg-secondary' : ''
                      )}
                    >
                      <PlusIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground">Create Bounty</span>
                    </Link>
                    <Link
                      href="/app/account?tab=sponsored"
                      onClick={() => setShowDropdown(false)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-secondary',
                        pathname?.startsWith('/app/account') ? 'bg-secondary' : ''
                      )}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-foreground">Account</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="p-1.5 border-t border-border/40">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-destructive/5"
                    >
                      <LogoutIcon className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-destructive">Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                const returnPath = isAppRoute ? pathname : '/app';
                window.location.href = `/api/oauth/github?returnTo=${encodeURIComponent(returnPath)}`;
              }}
              className="px-4 py-1.5 text-sm text-primary-foreground bg-primary rounded-full hover:opacity-90 transition-all"
            >
              Log in
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
