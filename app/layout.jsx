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

export default function RootLayout({ children }) {
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
      <body>
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
            </BetaAccessProvider>
          </NetworkProvider>
        </Providers>
      </body>
    </html>
  );
}

