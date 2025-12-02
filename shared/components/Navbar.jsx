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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <nav className={`max-w-3xl mx-auto flex items-center justify-between px-4 py-2 rounded-full border transition-all duration-300 ${
        scrolled
          ? 'bg-card/95 backdrop-blur-custom border-border shadow-sm'
          : 'bg-card/80 backdrop-blur-sm border-border/80'
      }`}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-base font-semibold tracking-tight text-foreground">
            BountyPay
          </span>
        </Link>

        {/* Center Navigation */}
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
                <div className="absolute top-full mt-2 right-0 w-52 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-2.5 border-b border-border">
                    <button
                      onClick={handleNetworkSwitch}
                      disabled={isSwitchingGroup}
                      type="button"
                      className="w-full cursor-pointer rounded-lg border border-border bg-secondary px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            networkEnv === 'mainnet' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {networkEnv === 'mainnet' ? 'Mainnet' : 'Testnet'}
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Tap to switch
                      </p>
                    </button>
                  </div>

                  <div className="p-1.5">
                    <Link
                      href="/app/account?tab=sponsored"
                      onClick={() => setShowDropdown(false)}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors text-foreground hover:bg-accent ${
                        isActive('/app/account') ? 'font-medium' : ''
                      }`}
                    >
                      Account
                    </Link>
                  </div>

                  <div className="p-1.5 border-t border-border">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-sm text-left rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Log out
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
