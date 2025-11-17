# Network Configuration Migration Guide

This guide explains the new network configuration system and how to migrate from the old setup.

## Overview

The project has been refactored to use a **single source of truth** for network and token configuration with support for mainnet/testnet switching via a UI toggle.

## Key Changes

### 1. Centralized Chain Registry

All network, token, contract, and ABI configuration is now managed through `config/chain-registry.js`:

- **REGISTRY**: Complete network configurations indexed by alias
- **ABIS**: All contract ABIs (escrow, ERC20)
- **Helper functions**: `getAlias()`, `getAliasesForGroup()`, `getDefaultAliasForGroup()`

### 2. New Environment Variables

The configuration now uses descriptive, alias-based environment variables:

**Network Groups:**
```bash
BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES=BASE_MAINNET,MEZO_MAINNET
BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES=BASE_SEPOLIA,MEZO_TESTNET
BLOCKCHAIN_DEFAULT_MAINNET_ALIAS=BASE_MAINNET
BLOCKCHAIN_DEFAULT_TESTNET_ALIAS=BASE_SEPOLIA
```

**Per-Network Configuration (required for each supported alias):**
```bash
# Example for BASE_MAINNET
BASE_MAINNET_ESCROW_ADDRESS=0x...
BASE_MAINNET_TOKEN_ADDRESS=0x...
BASE_MAINNET_TOKEN_SYMBOL=USDC
BASE_MAINNET_TOKEN_DECIMALS=6
BASE_MAINNET_RPC_URL=...  # Optional override
BASE_MAINNET_FEE_VAULT_ADDRESS=...  # Optional
```

**Deprecated (removed):**
- `CHAIN_ID`
- `RPC_URL`
- `ESCROW_CONTRACT`
- `USDC_CONTRACT`
- `MUSD_CONTRACT`

### 3. Mainnet/Testnet Toggle

A new toggle has been added to the Navbar that allows switching between mainnet and testnet:

- Sets a cookie (`network_env`) to persist the selection
- All API routes read this cookie to determine the active network
- Calls `router.refresh()` to update the page with the new network context

### 4. Strict Validation

The new system **fails fast** with clear error messages if any configuration is missing or invalid:

- No implicit fallbacks
- RPC URLs default to curated values only if not overridden
- Contract addresses, token symbols, and decimals must be explicitly configured
- Validation runs at startup via `validateConfig()`

## Migration Steps

### Step 1: Update Environment Variables

Copy `.env.example.txt` and configure all networks you want to support.

**Minimum for local development (testnet only):**
```bash
BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES=BASE_SEPOLIA
BLOCKCHAIN_DEFAULT_TESTNET_ALIAS=BASE_SEPOLIA
BASE_SEPOLIA_ESCROW_ADDRESS=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
BASE_SEPOLIA_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BASE_SEPOLIA_TOKEN_SYMBOL=USDC
BASE_SEPOLIA_TOKEN_DECIMALS=6
```

**For production (mainnet + testnet):**
```bash
BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES=BASE_MAINNET,MEZO_MAINNET
BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES=BASE_SEPOLIA,MEZO_TESTNET
BLOCKCHAIN_DEFAULT_MAINNET_ALIAS=BASE_MAINNET
BLOCKCHAIN_DEFAULT_TESTNET_ALIAS=BASE_SEPOLIA
# ... configure all four networks
```

### Step 2: Update Code Imports

If you have any custom code that referenced the old `config/networks.js`:

**Old:**
```javascript
import { NETWORKS, CONTRACTS } from '@/config/networks';
const chainId = NETWORKS.BASE_SEPOLIA.chainId;
```

**New:**
```javascript
import { REGISTRY } from '@/config/chain-registry';
const chainId = REGISTRY.BASE_SEPOLIA.chainId;
```

### Step 3: Use Network-Aware APIs

API routes now automatically use the active network from the cookie:

```javascript
import { cookies } from 'next/headers';
import { getActiveAliasFromCookies } from '@/lib/network-env';
import { REGISTRY } from '@/config/chain-registry';

export async function POST(request) {
  const cookieStore = cookies();
  const alias = getActiveAliasFromCookies(cookieStore);
  const network = REGISTRY[alias];
  
  // Use network.chainId, network.token, network.contracts, etc.
}
```

### Step 4: Test Configuration

Run the configuration test:

```bash
node test-config.js
```

This validates:
- All networks are properly configured
- Helper functions work correctly
- Server config validation passes
- Token mappings are correct

## Network Aliases

### Mainnet
- **BASE_MAINNET**: Base mainnet (Chain ID: 8453)
- **MEZO_MAINNET**: Mezo mainnet (Chain ID: 31612)

### Testnet
- **BASE_SEPOLIA**: Base Sepolia testnet (Chain ID: 84532)
- **MEZO_TESTNET**: Mezo testnet (Chain ID: 31611)

## Files Changed

### New Files
- `config/chain-registry.js` - Centralized network configuration
- `lib/network-env.js` - Cookie helpers for network selection
- `app/api/network/env/route.js` - API for setting network environment
- `test-config.js` - Configuration validation test

### Modified Files
- `server/config.js` - Removed blockchain fields, added validation
- `server/blockchain/contract.js` - Uses REGISTRY, removed hardcoded defaults
- `server/blockchain/validation.js` - Dynamic alias validation
- `server/auth/siwe.js` - Uses default alias for chainId
- `app/api/bounty/create/route.js` - Cookie-driven network selection
- `app/api/tokens/route.js` - Returns CONFIG.tokens from REGISTRY
- `components/Navbar.jsx` - Added mainnet/testnet toggle
- `ENV_EXAMPLE.txt` - Complete rewrite with new variables

### Removed Files
- `config/networks.js` - Replaced by chain-registry.js

## Troubleshooting

### "Missing required config: X_ESCROW_ADDRESS"

You need to configure all required variables for each network listed in `BLOCKCHAIN_SUPPORTED_*_ALIASES`.

### "Invalid network alias"

The network alias must match one of: `BASE_MAINNET`, `MEZO_MAINNET`, `BASE_SEPOLIA`, `MEZO_TESTNET`.

### "No testnet networks configured"

You must configure at least one testnet network for development. Add `BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES=BASE_SEPOLIA` and the required BASE_SEPOLIA_* variables.

### Toggle doesn't work

Make sure:
1. The API route `/api/network/env` is accessible
2. Both mainnet and testnet networks are configured
3. Cookies are enabled in your browser

## Benefits

1. **Single Source of Truth**: All network config in one place
2. **Type Safety**: Centralized configuration reduces errors
3. **Explicit Configuration**: No hidden defaults or fallbacks
4. **Better Developer Experience**: Clear error messages when misconfigured
5. **User Control**: Easy mainnet/testnet switching via UI
6. **Maintainability**: Easy to add new networks or update existing ones

