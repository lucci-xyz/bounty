'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import HomePage from '@/features/home/components/HomePage';
import { AccountContent } from '@/features/account/components/AccountContent';

function AccountSection({ initialTab }) {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ maxWidth: '1200px', padding: '32px 24px' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      }
    >
      <AccountContent initialTab={initialTab} />
    </Suspense>
  );
}

function DashboardSection() {
  return <AccountSection initialTab="sponsored" />;
}

function ProfileSection() {
  return <AccountSection initialTab="settings" />;
}

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

export default function BaseMiniAppPage() {
  const [activeSection, setActiveSection] = useState(MINI_APP_SECTIONS[0].id);

  useEffect(() => {
    let mounted = true;

    async function signalReady() {
      if (!sdk?.actions?.ready) {
        return;
      }

      try {
        await sdk.actions.ready();
      } catch (error) {
        if (mounted) {
          console.error('Error signalling Base mini app readiness:', error);
        }
      }
    }

    signalReady();
    return () => {
      mounted = false;
    };
  }, []);

  const ActiveSectionComponent = useMemo(() => {
    const match = MINI_APP_SECTIONS.find((section) => section.id === activeSection);
    return match ? match.Component : MINI_APP_SECTIONS[0].Component;
  }, [activeSection]);

  return (
    <div
      className="container"
      style={{
        maxWidth: '1200px',
        padding: '32px 20px 48px',
        width: '100%',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <p
          className="text-xs uppercase tracking-wide mb-2"
          style={{ color: '#39BEB7', fontWeight: 600 }}
        >
          Base Mini App
        </p>
        <h1
          style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 600,
            color: '#00827B',
            marginBottom: '8px',
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          Explore BountyPay in one place
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '640px' }}>
          Toggle between the existing home, dashboard, and profile experiences without leaving this page.
          Everything you see here reuses the production-ready screens.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {MINI_APP_SECTIONS.map((section) => {
          const isActive = section.id === activeSection;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              style={{
                flex: '1 1 220px',
                minWidth: '200px',
                borderRadius: '12px',
                border: isActive ? '1px solid transparent' : '1px solid var(--color-border)',
                background: isActive ? '#00827B' : 'white',
                color: isActive ? 'white' : 'var(--color-text-primary)',
                textAlign: 'left',
                padding: '16px 18px',
                cursor: 'pointer',
                boxShadow: isActive ? '0 12px 24px rgba(0, 130, 123, 0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{section.label}</div>
              <div
                style={{
                  fontSize: '13px',
                  color: isActive ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)',
                  marginTop: '2px',
                }}
              >
                {section.description}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
          background: 'var(--color-background)',
          overflow: 'hidden',
        }}
      >
        <ActiveSectionComponent key={activeSection} />
      </div>
    </div>
  );
}


