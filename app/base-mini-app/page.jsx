'use client';

/**
 * Base Mini App page.
 * Provides a unified view of home feed, dashboard, and profile sections
 * within a single-page mini app experience for Farcaster.
 */

import { useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { logger } from '@/lib/logger';
import { cn } from '@/lib';
import HomePage from '@/ui/pages/home/HomePage';
import { AccountContent } from '@/ui/pages/account/AccountContent';
import { AccountProvider } from '@/ui/providers/AccountProvider';

/**
 * Section configuration for mini app navigation.
 */
const SECTIONS = [
  {
    id: 'home',
    label: 'Bounties',
    description: 'Browse open bounties'
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Manage your funded issues'
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Settings and payouts'
  }
];

/**
 * Renders account content wrapped in the required AccountProvider.
 * @param {Object} props
 * @param {string} props.initialTab - Initial tab to display in AccountContent.
 */
function AccountSection({ initialTab }) {
  return (
    <AccountProvider>
      <AccountContent initialTab={initialTab} />
    </AccountProvider>
  );
}

/**
 * Main Base Mini App page component.
 */
export default function BaseMiniAppPage() {
  const [activeSection, setActiveSection] = useState('home');

  // Signal readiness to Farcaster Mini App SDK on mount
  useEffect(() => {
    let mounted = true;

    async function signalReady() {
      if (!sdk?.actions?.ready) return;
      try {
        await sdk.actions.ready();
      } catch (error) {
        if (mounted) {
          logger.error('Mini app SDK ready signal failed:', error);
        }
      }
    }

    signalReady();
    return () => {
      mounted = false;
    };
  }, []);

  // Render the active section content
  const renderSection = useMemo(() => {
    switch (activeSection) {
      case 'dashboard':
        return <AccountSection initialTab="sponsored" />;
      case 'profile':
        return <AccountSection initialTab="settings" />;
      case 'home':
      default:
        return <HomePage />;
    }
  }, [activeSection]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <p
          role="heading"
          aria-level={1}
          className="mb-2 text-[clamp(22px,3vw,30px)] font-light tracking-[-0.02em] text-foreground/90"
        >
          BountyPay Mini
        </p>
        <p className="text-sm text-muted-foreground">
          Browse bounties, manage issues, and track payouts in one place
        </p>
      </div>

      {/* Section tabs */}
      <div className="mb-6 flex flex-wrap gap-3">
        {SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex-1 min-w-[160px] rounded-xl border px-4 py-3 text-left transition-all',
                isActive
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/60 bg-card hover:border-primary/40'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-primary' : 'text-foreground'
                )}
              >
                {section.label}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {section.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Section content */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        {renderSection}
      </div>
    </div>
  );
}
