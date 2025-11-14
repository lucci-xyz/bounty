'use client';

import { RainbowKitProvider, lightTheme, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet, rainbowWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
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

const queryClient = new QueryClient();

const customTheme = lightTheme({
  accentColor: '#00827B',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
});

export function Providers({ children }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={customTheme} 
          modalSize="compact"
          initialChain={undefined}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

