import '@/styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/ui/providers/Providers';
import { NetworkProvider } from '@/ui/providers/NetworkProvider';
import { BetaAccessProvider } from '@/ui/providers/BetaAccessProvider';
import Navbar from '@/ui/components/Navbar';
import Footer from '@/ui/components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { MINI_APP_EMBED } from '@/app/base-mini-app/manifest';
import { getLinkHref } from '@/config/links';
import { FlagProvider } from '@/ui/providers/FlagProvider';
import { FlagsInspector } from '@/ui/providers/FlagsInspector';
import { getFlags, getFlagProviderData } from '@/lib/flags';

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

