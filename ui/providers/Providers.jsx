'use client';

import { useState } from 'react';
import { RainbowKitProvider, lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ErrorModalProvider } from '@/ui/providers/ErrorModalProvider';
import { getLinkHref } from '@/config/links';

const baseMainnetRpc = getLinkHref('rpc', 'baseMainnet');
const baseMainnetExplorer = getLinkHref('explorers', 'baseMainnet');
const baseSepoliaRpc = getLinkHref('rpc', 'baseSepolia');
const mezoTestnetRpc = getLinkHref('rpc', 'mezoDrpc');
const mezoTestnetExplorer = getLinkHref('explorers', 'mezoTestnet');

const baseMainnet = {
  ...base,
  rpcUrls: {
    default: { http: [baseMainnetRpc] },
    public: { http: [baseMainnetRpc] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: baseMainnetExplorer },
  },
};

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
    default: { http: [mezoTestnetRpc] },
    public: { http: [mezoTestnetRpc] },
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: mezoTestnetExplorer },
  },
  testnet: true,
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '73b4fe978f9e3084af5e7c7595365793';
const chains = [baseMainnet, baseSepolia, mezoTestnet];

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
    [baseMainnet.id]: http(baseMainnetRpc),
    [baseSepolia.id]: http(baseSepoliaRpc),
    [mezoTestnet.id]: http(mezoTestnetRpc),
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

