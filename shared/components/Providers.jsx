'use client';

import { useState } from 'react';
import { RainbowKitProvider, lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ErrorModalProvider } from '@/shared/components/ErrorModalProvider';

// Define custom Mezo Testnet chain
const mezoTestnet = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: {
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://mezo-testnet.drpc.org'] },
    public: { http: ['https://mezo-testnet.drpc.org'] },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' },
  },
  testnet: true,
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '73b4fe978f9e3084af5e7c7595365793';
const chains = [baseSepolia, mezoTestnet];

// Configure wallets with injectedWallet first to catch all browser wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,  // This will show as "Browser Wallet" and detect Brave, OKX, etc.
        metaMaskWallet,
        coinbaseWallet,
        walletConnectWallet,
        rainbowWallet,
      ],
    },
  ],
  {
    appName: 'BountyPay',
    projectId,
  }
);

const config = createConfig({
  connectors,
  chains,
  transports: {
    [baseSepolia.id]: http(),
    [mezoTestnet.id]: http(),
  },
  ssr: true,
});

const customTheme = lightTheme({
  accentColor: '#00827B',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
});

export function Providers({ children }) {
  // Create a new QueryClient for each instance to avoid state issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={customTheme} 
          modalSize="compact"
        >
          <ErrorModalProvider>
            {children}
          </ErrorModalProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

