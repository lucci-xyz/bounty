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
| BountyEscrow | [`0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD`](https://sepolia.basescan.org/address/0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD) | Main escrow contract for bounty funds |
| FeeVault | [`0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`](https://sepolia.basescan.org/address/0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3) | Protocol fee collection vault |
| USDC (Test) | [`0x036CbD53842c5426634e7929541eC2318f3dCF7e`](https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e) | Test USDC token (6 decimals) |

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
| BountyEscrow | [`0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`](https://explorer.test.mezo.org/address/0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3) | Main escrow contract for bounty funds |
| FeeVault | [`0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094`](https://explorer.test.mezo.org/address/0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094) | Protocol fee collection vault |
| MUSD (Test) | [`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`](https://explorer.test.mezo.org/address/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503) | Mezo USD stablecoin (18 decimals) |

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
