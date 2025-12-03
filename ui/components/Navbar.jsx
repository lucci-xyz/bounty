'use client';
import { logger } from '@/lib/logger';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useNetwork } from '@/ui/providers/NetworkProvider';
import UserAvatar from '@/ui/components/UserAvatar';
import { useGithubUser } from '@/ui/hooks/useGithubUser';
import { useErrorModal } from '@/ui/providers/ErrorModalProvider';
import { cn } from '@/lib';
import { PlusIcon, UserIcon, LogoutIcon, NetworkIcon } from '@/ui/components/Icons';

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
    <header className="fixed top-0 left-0 right-0 z-50 px-0 pt-4">
      <nav className={cn(
        'max-w-3xl mx-auto relative flex items-center justify-between px-4 py-2 rounded-full border transition-all duration-300',
        scrolled
          ? 'bg-card/95 backdrop-blur-custom border-border shadow-sm'
          : 'bg-card/80 backdrop-blur-sm border-border/80'
      )}>
        {/* Logo - links to app if in app, otherwise landing */}
        <Link href={isAppRoute ? "/app" : "/"} className="flex items-center gap-1 flex-shrink-0 z-10">
          <Image
            src="/icons/og.png"
            alt="BountyPay cube logo"
            width={36}
            height={36}
            className="h-7 w-7 md:h-9 md:w-9 rounded-md object-contain"
            priority
          />
          <span className="font-instrument-serif text-lg md:text-xl text-foreground leading-tight tracking-tight">
            BountyPay
          </span>
        </Link>

        {/* Center Navigation - Absolutely centered, only show on landing page */}
        {!isAppRoute && (
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6">
            <Link 
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              How it works
            </Link>
            <Link 
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Features
            </Link>
            <Link 
              href="#faq"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              FAQ
            </Link>
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0 z-10">
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
