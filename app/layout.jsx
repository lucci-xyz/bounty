import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/shared/providers/Providers';
import { NetworkProvider } from '@/shared/providers/NetworkProvider';
import { BetaAccessProvider } from '@/features/beta-access/providers/BetaAccessProvider';
import Navbar from '@/shared/components/Navbar';
import Footer from '@/shared/components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { MINI_APP_EMBED } from '@/app/(public)/base-mini-app/manifest';
import { getLinkHref } from '@/shared/config/links';
import { FlagProvider } from '@/shared/providers/FlagProvider';
import { FlagsInspector } from '@/shared/providers/FlagsInspector';
import { getFlags, getFlagProviderData } from '@/shared/lib/flags';

export const metadata = {
  title: 'BountyPay - Automated GitHub Bounty Payments',
  description: 'Fund GitHub issues with crypto. Contributors get paid automatically when PRs merge.',
  other: {
    'fc:miniapp': JSON.stringify(MINI_APP_EMBED),
  },
};

const FONT_PRECONNECT = getLinkHref('assets', 'fontsApiPreconnect');
const FONT_STATIC_PRECONNECT = getLinkHref('assets', 'fontsStaticPreconnect');
const FONT_STYLESHEET = getLinkHref('assets', 'fontsDmSansAndFriends');

function toFlagAttributes(flags) {
  return Object.entries(flags).reduce((acc, [name, value]) => {
    const normalizedName = name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();

    acc[`data-flag-${normalizedName}`] =
      typeof value === 'boolean' || typeof value === 'number'
        ? String(value)
        : JSON.stringify(value);

    return acc;
  }, {});
}

export default async function RootLayout({ children }) {
  const flags = await getFlags();
  const flagTelemetry = getFlagProviderData();
  const bodyAttributes = toFlagAttributes(flags);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href={FONT_PRECONNECT} />
        <link rel="preconnect" href={FONT_STATIC_PRECONNECT} crossOrigin="anonymous" />
        <link
          href={FONT_STYLESHEET}
          rel="stylesheet"
        />
      </head>
      <body {...bodyAttributes}>
        <FlagProvider value={flags}>
          <Providers>
            <NetworkProvider>
              <BetaAccessProvider>
                <div className="flex min-h-screen flex-col">
                  <Navbar />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                <Analytics />
                <FlagsInspector
                  definitions={flagTelemetry?.definitions}
                  values={flags}
                />
              </BetaAccessProvider>
            </NetworkProvider>
          </Providers>
        </FlagProvider>
      </body>
    </html>
  );
}

