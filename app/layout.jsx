import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/shared/components/Providers';
import { NetworkProvider } from '@/shared/components/NetworkProvider';
import { BetaAccessProvider } from '@/features/beta-access/providers/BetaAccessProvider';
import Navbar from '@/shared/components/Navbar';
import Footer from '@/shared/components/Footer';
import { Analytics } from '@vercel/analytics/react';
import { MINI_APP_EMBED } from '@/app/(public)/base-mini-app/manifest';

export const metadata = {
  title: 'BountyPay - Automated GitHub Bounty Payments',
  description: 'Fund GitHub issues with crypto. Contributors get paid automatically when PRs merge.',
  other: {
    'fc:miniapp': JSON.stringify(MINI_APP_EMBED),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Jetbrains+Mono:wght@400;500&display=swap"
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

