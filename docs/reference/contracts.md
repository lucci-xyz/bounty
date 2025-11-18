# Smart Contract Addresses

Quick reference for deployed BountyPay contracts on all supported networks.

---

## Base Sepolia Testnet

**Network Details:**
- Chain ID: `84532`
- Native Currency: ETH
- RPC URL: `https://sepolia.base.org`
- Block Explorer: [`https://sepolia.basescan.org`](https://sepolia.basescan.org)

**Deployed Contracts:**

| Contract | Address | Description |
|----------|---------|-------------|
| BountyEscrow | [`0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7`](https://sepolia.basescan.org/address/0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7) | Main escrow contract (holds user funds + protocol fees) |
| USDC (Test) | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | Test USDC token (6 decimals) |

> Latest BountyEscrow deployment (Nov 17, 2025): [`0xa19fe746a6efee740bf9cd37790368078cd1a93f00702495e1233de4f10a4689`](https://sepolia.basescan.org/tx/0xa19fe746a6efee740bf9cd37790368078cd1a93f00702495e1233de4f10a4689)

---

## Mezo Testnet

**Network Details:**
- Chain ID: `31611`
- Native Currency: BTC (Bitcoin)
- RPC URL: `https://mezo-testnet.drpc.org` (dRPC - reliable)
- Alternative RPCs:
  - `https://rpc.test.mezo.org` (Official, may have connectivity issues)
  - `https://testnet-rpc.lavenderfive.com:443/mezo/` (Lavender.Five)
- Block Explorer: [`https://explorer.test.mezo.org`](https://explorer.test.mezo.org)

> **Note:** Boar Network (`rpc-http.mezo.boar.network`) is only available for Mezo **Mainnet** (Chain ID 31612), not testnet. You can customize the testnet RPC by setting `NEXT_PUBLIC_MEZO_RPC_URL` in your environment variables.

**Deployed Contracts:**

| Contract | Address | Description |
|----------|---------|-------------|
| BountyEscrow | [`0xcBaf5066aDc2299C14112E8A79645900eeb3A76a`](https://explorer.test.mezo.org/address/0xcBaf5066aDc2299C14112E8A79645900eeb3A76a) | Main escrow contract (holds user funds + protocol fees) |
| MUSD (Test) | [`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`](https://explorer.test.mezo.org/address/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503) | Mezo USD stablecoin (18 decimals) |

> Latest BountyEscrow deployment (Nov 17, 2025): [`0x58ceec0b7579df664edd095756bc96aef8ce0dac2318e0b29d07082572c6ba1d`](https://explorer.test.mezo.org/tx/0x58ceec0b7579df664edd095756bc96aef8ce0dac2318e0b29d07082572c6ba1d)

> **Note:** Each network operates independently. Bounties created on Base Sepolia use USDC, while bounties on Mezo Testnet use MUSD. There is no bridging between networks.

---

## Token Details

### USDC (Base Sepolia)

- **Symbol**: USDC
- **Decimals**: 6
- **Type**: ERC-20 stablecoin
- **Value**: $1 USD (testnet)

### MUSD (Mezo Testnet)

- **Symbol**: MUSD
- **Decimals**: 18
- **Type**: ERC-20 Bitcoin-backed stablecoin
- **Value**: $1 USD (testnet)
- **Backing**: Bitcoin collateral on Mezo

---

## Adding Networks to Your Wallet

### Base Sepolia in MetaMask

1. Open MetaMask
2. Click network dropdown
3. Select "Add Network"
4. Enter:
   - Network Name: Base Sepolia
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: ETH
   - Block Explorer: `https://sepolia.basescan.org`

### Mezo Testnet in MetaMask

1. Open MetaMask
2. Click network dropdown
3. Select "Add Network"
4. Enter:
   - Network Name: Mezo Testnet
   - RPC URL: `https://mezo-testnet.drpc.org`
   - Chain ID: `31611`
   - Currency Symbol: BTC
   - Block Explorer: `https://explorer.test.mezo.org`

---

## Audit Reports

Audit reports and deployment history are coming soon.

---

## Next Steps

- **[Smart Contracts Documentation](smart-contracts.md)** - Complete technical reference
- **[Getting Started](../guides/getting-started.md)** - User guide for creating bounties
- **[API Documentation](api.md)** - Backend integration
