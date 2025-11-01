import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import App from './App';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Define Mezo Testnet chain (31611)
const mezoTestnet = {
  id: 31611,
  name: 'Mezo Testnet',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_MEZO_RPC_URL || 'https://mezo-testnet.drpc.org'] },
    public: { http: [import.meta.env.VITE_MEZO_RPC_URL || 'https://mezo-testnet.drpc.org'] }
  },
  blockExplorers: {
    default: { name: 'Mezo Explorer', url: 'https://explorer.test.mezo.org' }
  },
  testnet: true
};

const wagmiConfig = getDefaultConfig({
  appName: 'BountyPay (Testnet)',
  projectId: import.meta.env.VITE_WC_PROJECT_ID || 'demo',
  chains: [mezoTestnet, baseSepolia]
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={mezoTestnet}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);

