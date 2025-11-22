'use client';
import { logger } from '@/shared/lib/logger';

/**
 * Main page for the Base Mini App.
 * Lets users switch between Home, Dashboard, and Profile sections.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import HomePage from '@/features/home/components/HomePage';
import { AccountContent } from '@/features/account/components/AccountContent';
import { cn } from '@/shared/lib';

/**
 * Shows an account section inside a suspense boundary.
 * @param {Object} props
 * @param {string} props.initialTab - Initial tab to open in AccountContent.
 */
function AccountSection({ initialTab }) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
          <p>Loading...</p>
        </div>
      }
    >
      <AccountContent initialTab={initialTab} />
    </Suspense>
  );
}

/**
 * Dashboard tab content for funded issue management.
 */
function DashboardSection() {
  return <AccountSection initialTab="sponsored" />;
}

/**
 * Profile tab content for user payouts & settings.
 */
function ProfileSection() {
  return <AccountSection initialTab="settings" />;
}

/**
 * Configuration for the available mini app sections.
 */
const MINI_APP_SECTIONS = [
  {
    id: 'home',
    label: 'Home',
    description: 'Browse public bounties',
    Component: HomePage,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Manage funded issues',
    Component: DashboardSection,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Track your payouts',
    Component: ProfileSection,
  },
];

/**
 * The main component for the mini app hybrid page.
 */
export default function BaseMiniAppPage() {
  // Controls which section is active (home, dashboard, profile)
  const [activeSection, setActiveSection] = useState(MINI_APP_SECTIONS[0].id);

  // Signal readiness to Farcaster Mini App SDK on mount
  useEffect(() => {
    let mounted = true;

    async function signalReady() {
      if (!sdk?.actions?.ready) return;
      try {
        await sdk.actions.ready();
      } catch (error) {
        if (mounted) {
          logger.error('Error signalling Base mini app readiness:', error);
        }
      }
    }

    signalReady();
    return () => {
      mounted = false;
    };
  }, []);

  // Pick the component for the current section
  const ActiveSectionComponent = useMemo(() => {
    const match = MINI_APP_SECTIONS.find((section) => section.id === activeSection);
    return match ? match.Component : MINI_APP_SECTIONS[0].Component;
  }, [activeSection]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      {/* Header and page info */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#39BEB7]">
          Base Mini App
        </p>
        <h1 className="mb-2 text-[clamp(28px,5vw,40px)] font-semibold text-primary">
          Explore BountyPay in one place
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Toggle between the existing home, dashboard, and profile experiences without leaving this page.
          Everything you see here reuses the production-ready screens.
        </p>
      </div>

      {/* Tabs for switching sections */}
      <div className="mb-5 flex flex-wrap gap-3">
        {MINI_APP_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex-1 min-w-[200px] rounded-xl border px-5 py-4 text-left shadow-sm transition-all',
                isActive
                  ? 'border-transparent bg-primary text-primary-foreground shadow-lg'
                  : 'border-border bg-card text-foreground'
              )}
            >
              <div className="text-base font-semibold">{section.label}</div>
              <div
                className={cn(
                  'mt-0.5 text-sm',
                  isActive ? 'text-white/80' : 'text-muted-foreground'
                )}
              >
                {section.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main section render area */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-[0_16px_40px_rgba(0,0,0,0.08)]">
        <ActiveSectionComponent key={activeSection} />
      </div>
    </div>
  );
}

