# Mezo Integration Guide

## Overview

BountyPay now supports **dual-network** bounties! Users can create and pay bounties on both:
- **Base Sepolia** with USDC
- **Mezo Testnet** with MUSD (native stablecoin on Mezo)

This integration maintains full backward compatibility with existing Base bounties while adding Mezo support.

## What Was Implemented

### 1. Multi-Network Architecture

#### Backend (`server/blockchain/contract.js`)
- **Network-aware contract interactions**: Functions now accept a `network` parameter ('base' or 'mezo')
- **Dual provider system**: Maintains separate connections to both Base Sepolia and Mezo Testnet
- **Network-specific token handling**: Automatically uses USDC (6 decimals) for Base or MUSD (18 decimals) for Mezo
- **Unified resolver**: Same resolver private key works across both networks

#### Configuration (`server/config.js`)
```javascript
blockchain: {
  base: {
    chainId: 84532,
    name: 'Base Sepolia',
    tokenContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
    tokenSymbol: 'USDC',
    tokenDecimals: 6,
    // ...
  },
  mezo: {
    chainId: 31611,
    name: 'Mezo Testnet',
    tokenContract: '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503', // MUSD
    tokenSymbol: 'MUSD',
    tokenDecimals: 18,
    // ...
  }
}
```

### 2. Database Schema Updates

Added two new columns to the `bounties` table:
- `network` (TEXT): 'base' or 'mezo'
- `chain_id` (INTEGER): Chain ID for the network (84532 or 31611)

This allows tracking which network each bounty is on and displaying the correct information in GitHub comments.

### 3. Frontend Network Selection

#### `public/attach-bounty.html`
- **Network selector UI**: Users can choose between Base Sepolia and Mezo Testnet before connecting wallet
- **Dynamic token display**: Shows USDC or MUSD based on selected network
- **Automatic network switching**: Prompts users to switch networks if needed
- **Network-specific approvals**: Approves the correct token contract for the selected network
- **Visual network indicators**: Shows which network is currently selected

Features:
- ✅ Network selection before wallet connection
- ✅ Automatic MetaMask network switching
- ✅ Network-specific token amounts (6 decimals vs 18 decimals)
- ✅ Block explorer links for each network
- ✅ Network badges showing current selection

#### `public/link-wallet.html`
- **Multi-network support**: Same wallet works for bounties on both networks
- **Flexible SIWE signing**: Signs with current network (Base or Mezo)
- **Clear messaging**: Informs users their wallet works on both networks

### 4. GitHub Integration

#### Bounty Comments (`server/github/webhooks.js`)
Bounty comments now display:
- Network name (Base Sepolia or Mezo Testnet)
- Token symbol (USDC or MUSD)
- Network-specific block explorer links
- Correct token decimals in formatted amounts

Example comment:
```markdown
## 💰 Bounty: 500 MUSD on Mezo Testnet

**Deadline:** 2025-11-08
**Status:** Open
**Network:** Mezo Testnet
**Tx:** [`0x1234...`](https://explorer.test.mezo.org/tx/0x1234...)
```

### 5. API Endpoints

#### New Endpoint: `GET /api/networks`
Returns configuration for all supported networks:
```json
{
  "base": {
    "chainId": 84532,
    "name": "Base Sepolia",
    "tokenSymbol": "USDC",
    // ...
  },
  "mezo": {
    "chainId": 31611,
    "name": "Mezo Testnet",
    "tokenSymbol": "MUSD",
    // ...
  }
}
```

#### Updated Endpoints
- `POST /api/bounty/create`: Now accepts `network` and `chainId` parameters
- `GET /api/contract/bounty/:bountyId`: Now accepts `?network=mezo` query parameter

## Contract Deployments

### Base Sepolia (Existing)
- **BountyEscrow**: `0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD`
- **FeeVault**: `0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Chain ID**: `84532`

### Mezo Testnet (New)
- **BountyEscrow**: `0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`
- **FeeVault**: `0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094`
- **MUSD**: `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`
- **Chain ID**: `31611`
- **RPC**: `https://rpc.test.mezo.org`
- **Explorer**: `https://explorer.test.mezo.org`

## User Flow

### Creating a Bounty on Mezo

1. User clicks "Create a bounty" button on GitHub issue
2. Redirected to `attach-bounty.html`
3. **Selects Mezo Testnet** from network options
4. Clicks "Connect Wallet"
5. MetaMask prompts to switch to Mezo Testnet (or add it if not present)
6. Enters bounty amount in MUSD
7. Sets deadline
8. Clicks "Fund Bounty"
9. Signs MUSD approval transaction
10. Signs bounty creation transaction
11. Bounty recorded in database with `network: 'mezo'` and `chain_id: 31611`
12. GitHub comment posted showing bounty in MUSD on Mezo Testnet

### Claiming a Bounty on Mezo

1. Developer opens PR that closes the issue
2. Developer links their wallet (works for both networks)
3. PR gets merged
4. BountyPay resolver automatically calls `resolveBounty()` on Mezo network
5. Developer receives MUSD on Mezo Testnet
6. GitHub comment posted with Mezo explorer link

## Environment Variables

Add these to your `.env` file for custom configuration:

```bash
# Base Sepolia (optional, defaults provided)
BASE_RPC_URL=https://sepolia.base.org
BASE_ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
BASE_USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Mezo Testnet (optional, defaults provided)
MEZO_RPC_URL=https://rpc.test.mezo.org
MEZO_ESCROW_CONTRACT=0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3
MEZO_MUSD_CONTRACT=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503

# Required: Same resolver key works for both networks
RESOLVER_PRIVATE_KEY=your_private_key_here
```

## Testing

### Manual Testing Checklist

- [ ] Create bounty on Base Sepolia with USDC
- [ ] Create bounty on Mezo Testnet with MUSD
- [ ] Switch networks mid-flow
- [ ] Link wallet on Base network
- [ ] Link wallet on Mezo network
- [ ] Resolve Base bounty (PR merge)
- [ ] Resolve Mezo bounty (PR merge)
- [ ] Verify GitHub comments show correct network
- [ ] Verify block explorer links work for both networks

## About MUSD

**MUSD** is Mezo's native stablecoin:
- Collateralized by BTC on Mezo
- 1:1 pegged to USD
- 18 decimals (like ETH)
- Can be minted via TroveManager contract
- No bridging needed - native to Mezo

### Getting MUSD for Testing

1. Bridge BTC to Mezo Testnet
2. Open a Trove on Mezo
3. Mint MUSD against your BTC collateral
4. Use MUSD for bounties

See `docs/mezo/musd/musd-redemptions.md` for details on MUSD redemption.

## About Mezo Network

**Mezo** is a Bitcoin L2 network:
- Native currency: BTC (18 decimals on EVM)
- EVM-compatible
- Supports standard Web3 wallets (MetaMask, etc.)
- Native Bitcoin wallet support via Mezo Passport

### Network Details

**Testnet:**
- Chain ID: `31611`
- RPC: `https://rpc.test.mezo.org`
- WSS: `wss://rpc-ws.test.mezo.org`
- Explorer: `https://explorer.test.mezo.org`

**Mainnet:**
- Chain ID: `31612`
- RPC: `https://rpc-http.mezo.boar.network`
- Explorer: `https://explorer.mezo.org`

## Future Enhancements

### Mezo Passport Integration (Coming Soon)

Currently, the integration uses standard EVM wallets (MetaMask, etc.). Future versions will integrate **Mezo Passport** to enable:

- Native Bitcoin wallet support (Unisat, Leather, etc.)
- Hybrid EVM + BTC wallet connections
- Seamless switching between wallet types
- Enhanced UX for Bitcoin-native users

Mezo Passport requires React/RainbowKit integration, which is planned for a future release.

### Potential Features

- [ ] Mainnet support for both networks
- [ ] Cross-network bounty transfers
- [ ] Multi-token support (BTC, other assets)
- [ ] Network analytics dashboard
- [ ] Gas estimation for both networks

## Troubleshooting

### Network Switch Fails
**Problem**: MetaMask won't switch to Mezo
**Solution**: Manually add Mezo network in MetaMask settings

### Wrong Token Decimals
**Problem**: Amounts look wrong
**Solution**: Verify you're using the correct network - USDC is 6 decimals, MUSD is 18

### Transaction Fails on Mezo
**Problem**: Transaction reverts
**Solution**: 
- Ensure you have BTC for gas on Mezo
- Check MUSD balance
- Verify contract addresses

### Bounty Not Showing in GitHub
**Problem**: Comment not posted
**Solution**: Check database has correct `network` and `chain_id` values

## Migration Notes

### Existing Bounties

All existing bounties in the database are automatically assigned:
- `network = 'base'`
- `chain_id = 84532`

This is handled by SQL defaults in the schema.

### Backward Compatibility

The system maintains full backward compatibility:
- Old API calls without `network` parameter default to 'base'
- Existing frontend flows work unchanged
- Legacy functions (`formatUSDC`, etc.) still work

## Support

For issues or questions:
- Open an issue on GitHub
- Join Mezo Discord: https://discord.com/invite/mezo
- Check Mezo docs: `docs/mezo/`

---

**Built with ❤️ for the open-source community**

