# React Migration Guide

## Overview

BountyPay has been migrated from vanilla JavaScript to React with RainbowKit and Mezo Passport integration. This provides:

- ✅ Better UX with RainbowKit wallet connections
- ✅ Mezo Passport support for Bitcoin wallets
- ✅ Simplified wallet management with Wagmi
- ✅ Modern React component architecture
- ✅ Better developer experience

## Architecture

### Frontend Stack
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **RainbowKit** - Wallet connection UI
- **Wagmi** - Ethereum hooks library
- **Mezo Passport** - Bitcoin + EVM wallet support
- **React Router** - Client-side routing
- **Styled Components** - CSS-in-JS styling

### Backend (Unchanged)
- **Node.js + Express** - API server
- **SQLite** - Database
- **Ethers.js** - Blockchain interactions
- **Octokit** - GitHub API

## Project Structure

```
bounty/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # Reusable React components
│   │   │   ├── NetworkSelector.jsx
│   │   │   ├── BountyForm.jsx
│   │   │   └── StatusMessage.jsx
│   │   ├── pages/            # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── AttachBounty.jsx
│   │   │   ├── LinkWallet.jsx
│   │   │   └── Refund.jsx
│   │   ├── config/           # Configuration
│   │   │   ├── networks.js
│   │   │   └── abis.js
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   └── index.html            # HTML template
├── server/                    # Express backend (unchanged)
├── public/                    # Static assets
│   ├── dist/                 # React build output (production)
│   ├── icons/                # Images
│   └── buttons/              # SVG buttons
├── vite.config.js            # Vite configuration
└── package.json              # Updated dependencies
```

## Installation

### 1. Install Dependencies

```bash
cd /Users/nataliehill/Developer/Github/lucci/bounty
npm install --legacy-peer-deps
```

Note: `--legacy-peer-deps` resolves React version conflicts between React 18 and Mezo Passport.

### 2. Development Mode

Run both server and client:
```bash
npm run dev
```

This starts:
- Express server on `http://localhost:3000`
- Vite dev server on `http://localhost:5173` (with proxy to backend)

### 3. Production Build

```bash
npm run build
npm start
```

The build creates optimized files in `public/dist/` which are served by Express.

## Key Changes

### 1. Wallet Connection (RainbowKit)

**Before (Vanilla JS):**
```javascript
const provider = new ethers.BrowserProvider(window.ethereum);
const accounts = await provider.send('eth_requestAccounts', []);
```

**After (React + RainbowKit):**
```jsx
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();
  
  return <ConnectButton />;
}
```

### 2. Network Switching

**Before:**
```javascript
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: `0x${chainId.toString(16)}` }],
});
```

**After:**
```jsx
import { useSwitchChain } from 'wagmi';

function MyComponent() {
  const { switchChain } = useSwitchChain();
  
  const handleSwitch = async () => {
    await switchChain({ chainId: 31611 });
  };
}
```

### 3. Contract Interactions

**Before:**
```javascript
const contract = new ethers.Contract(address, abi, signer);
const tx = await contract.approve(spender, amount);
await tx.wait();
```

**After:**
```jsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

function MyComponent() {
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });
  
  const handleApprove = async () => {
    await writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender, amount],
    });
  };
}
```

### 4. Mezo Passport Integration

Mezo Passport is now integrated via the wagmi config:

```javascript
import { getConfig, mezoTestnet } from '@mezo-org/passport';

const config = getConfig({
  appName: 'BountyPay',
  chains: [mezoTestnet], // Includes Base Sepolia + Mezo Testnet
});
```

This provides:
- Both EVM wallets (MetaMask, Coinbase, etc.)
- Bitcoin wallets (via Mezo Passport connector)
- Seamless switching between wallet types

## Component Guide

### NetworkSelector

Allows users to choose between Base and Mezo networks.

```jsx
<NetworkSelector 
  selectedNetwork={selectedNetwork}
  onNetworkChange={setSelectedNetwork}
/>
```

### BountyForm

Form for entering bounty amount and deadline.

```jsx
<BountyForm
  amount={amount}
  deadline={deadline}
  tokenSymbol="USDC"
  onAmountChange={setAmount}
  onDeadlineChange={setDeadline}
  onSubmit={handleSubmit}
  disabled={isProcessing}
/>
```

### StatusMessage

Displays status messages with appropriate styling.

```jsx
<StatusMessage 
  type="success" // success, error, loading, warning
  message="Bounty created successfully!"
/>
```

## Configuration

### Network Configuration (`client/src/config/networks.js`)

```javascript
export const NETWORKS = {
  base: {
    chainId: 84532,
    name: 'Base Sepolia',
    escrowAddress: '0x...',
    tokenAddress: '0x...',
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
  },
  mezo: {
    chainId: 31611,
    name: 'Mezo Testnet',
    escrowAddress: '0x...',
    tokenAddress: '0x...',
    tokenSymbol: 'MUSD',
    tokenDecimals: 18,
  },
};
```

### Contract ABIs (`client/src/config/abis.js`)

Simplified ABI definitions for contract interactions.

## Development Workflow

### 1. Start Development Servers

```bash
npm run dev
```

Frontend: `http://localhost:5173`
Backend API: `http://localhost:3000`

### 2. Make Changes

- Edit React components in `client/src/`
- Changes hot-reload automatically
- Backend changes require server restart (uses `--watch`)

### 3. Test

Navigate to:
- http://localhost:5173/ - Home page
- http://localhost:5173/attach-bounty?repo=owner/repo&issue=1&repoId=123&installationId=456
- http://localhost:5173/link-wallet

### 4. Build for Production

```bash
npm run build
```

Creates optimized build in `public/dist/`

### 5. Test Production Build

```bash
npm start
# Visit http://localhost:3000
```

## Deployment

### Environment Variables

Same as before - no changes needed:

```bash
SESSION_SECRET=...
GITHUB_APP_ID=...
RESOLVER_PRIVATE_KEY=...
# etc.
```

### Build Process

```bash
# On deployment server
npm install --legacy-peer-deps
npm run build
npm start
```

### Static File Serving

Express serves the React build:

```javascript
// Production
app.use(express.static('public/dist'));
app.get('*', (req, res) => {
  res.sendFile('public/dist/index.html');
});
```

## Troubleshooting

### Issue: React version conflicts

**Solution:** Use `--legacy-peer-deps` when installing:
```bash
npm install --legacy-peer-deps
```

### Issue: Vite dev server won't start

**Solution:** Check port 5173 is available:
```bash
lsof -i :5173
kill -9 <PID>
```

### Issue: API requests fail in development

**Solution:** Vite proxies `/api` to `localhost:3000`. Ensure backend is running:
```bash
npm run server:dev
```

### Issue: RainbowKit modal doesn't appear

**Solution:** Check console for errors. Ensure:
- RainbowKit CSS is imported
- WagmiProvider wraps the app
- Config is properly initialized

### Issue: Mezo Passport not showing Bitcoin wallets

**Solution:** Mezo Passport automatically includes Bitcoin wallet support. Make sure:
- You're using the config from `@mezo-org/passport`
- Wallet extensions are installed (Unisat, Leather, etc.)

## Benefits of React Migration

### Developer Experience
- ✅ Hot module replacement (instant updates)
- ✅ Better debugging with React DevTools
- ✅ TypeScript ready (can add later)
- ✅ Component reusability

### User Experience
- ✅ RainbowKit's beautiful wallet UI
- ✅ Better error handling
- ✅ Loading states
- ✅ Smooth animations

### Maintainability
- ✅ Clearer component structure
- ✅ Easier to test
- ✅ Standard React patterns
- ✅ Better state management

### Functionality
- ✅ Bitcoin wallet support (Mezo Passport)
- ✅ Multi-wallet support out of the box
- ✅ Better network switching UX
- ✅ Transaction state management

## Next Steps

### Immediate
1. Test all flows in development
2. Test production build
3. Update deployment pipeline

### Future Enhancements
1. Add TypeScript
2. Add unit tests (Jest + React Testing Library)
3. Add E2E tests (Playwright)
4. Implement transaction history page
5. Add wallet balance displays
6. Implement refund functionality

## Migration Checklist

- [x] Setup Vite + React
- [x] Install RainbowKit + Wagmi
- [x] Install Mezo Passport
- [x] Convert AttachBounty to React
- [x] Convert LinkWallet to React
- [x] Create reusable components
- [x] Setup routing
- [x] Configure networks
- [x] Update package.json scripts
- [x] Update server for React serving
- [ ] Test all user flows
- [ ] Test production build
- [ ] Deploy to production

## Resources

- [RainbowKit Docs](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Docs](https://wagmi.sh)
- [Mezo Passport](https://www.npmjs.com/package/@mezo-org/passport)
- [Vite Docs](https://vitejs.dev)
- [React Router](https://reactrouter.com)

---

**Migration Completed**: November 1, 2025
**React Version**: 18.2.0
**RainbowKit Version**: 2.0.2
**Mezo Passport Version**: 0.12.0

