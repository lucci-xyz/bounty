'use client';

import { useMemo, useState } from 'react';
import { RainbowKitProvider, lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ErrorModalProvider } from '@/ui/providers/ErrorModalProvider';
import { getLinkHref } from '@/config/links';
import { useFlag } from '@/ui/providers/FlagProvider';

const baseMainnetRpc = getLinkHref('rpc', 'baseMainnet');
const baseMainnetExplorer = getLinkHref('explorers', 'baseMainnet');
const baseSepoliaRpc = getLinkHref('rpc', 'baseSepolia');
const baseSepoliaExplorer = getLinkHref('explorers', 'baseSepolia');
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

const baseSepoliaChain = {
  ...baseSepolia,
  rpcUrls: {
    default: { http: [baseSepoliaRpc] },
    public: { http: [baseSepoliaRpc] },
  },
  blockExplorers: {
    default: { name: 'Basescan (Sepolia)', url: baseSepoliaExplorer },
  },
};

// Define custom Mezo Testnet chain with icon
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
  iconUrl: '/icons/mezo-logo.svg',
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '73b4fe978f9e3084af5e7c7595365793';

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

const customTheme = lightTheme({
  accentColor: '#374151', // Gray-700 for selected states
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
  const testnetsEnabled = useFlag('testnetNetworks', false);

  const selectedChains = useMemo(
    () => (testnetsEnabled ? [baseMainnet, baseSepoliaChain, mezoTestnet] : [baseMainnet]),
    [testnetsEnabled]
  );

  const config = useMemo(() => {
    const transports = {};
    for (const chain of selectedChains) {
      if (chain.id === baseMainnet.id) {
        transports[chain.id] = http(baseMainnetRpc);
      } else if (chain.id === baseSepoliaChain.id) {
        transports[chain.id] = http(baseSepoliaRpc);
      } else if (chain.id === mezoTestnet.id) {
        transports[chain.id] = http(mezoTestnetRpc);
      }
    }

    return createConfig({
      connectors,
      chains: selectedChains,
      transports,
      ssr: true,
    });
  }, [selectedChains]);

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

