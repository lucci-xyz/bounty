import './globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { Providers } from '@/components/Providers';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'BountyPay - Automated GitHub Bounty Payments',
  description: 'Fund GitHub issues with crypto. Contributors get paid automatically when PRs merge.',
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
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

