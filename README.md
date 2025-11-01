# <img src="public/icons/og.png" alt="BountyPay logo" width="50" style="vertical-align:middle;" /> BountyPay

_Automated, trust-minimised bounty payouts for open-source contributions. Fund with USDC on Base or MUSD on Mezo and let BountyPay handle the rest._

## Features

- **Automated Payouts**: Contributors are paid automatically when their PR merges and closes the issue
- **Secure Escrow**: Funds are held in smart contracts on Base Sepolia until resolution
- **No Manual Work**: Eliminates invoices, spreadsheets, and manual transfers
- **GitHub Integration**: Seamless workflow within GitHub issues and pull requests
- **Trust-Minimized**: Smart contracts ensure transparent and automatic payment execution
- **SIWE Authentication**: Secure wallet linking using Sign-In With Ethereum
- **Multiple Bounties**: Support for multiple bounties on the same issue
- **Automatic Refunds**: Sponsors can reclaim funds after deadline if issue isn't resolved

## Get Started in Minutes

1. **Install the GitHub App**  
   👉 [Download BountyPay](https://github.com/apps/bountypay)

2. **Open a New Issue** and click the `Create a bounty` button from the BountyPay bot.

3. **Choose Your Network & Fund**
   - **Base Sepolia**: Fund with USDC (EVM standard)
   - **Mezo Testnet**: Fund with MUSD (Bitcoin L2)
   
   Funds sit safely in escrow.

4. **Merge the winning PR** — BountyPay automatically pays the contributor once the PR closes the issue.

That's it. No invoices, no manual transfers, no spreadsheets.

## Example Workflow

### As a Sponsor

1. Open an issue describing the work needed
2. Click "Create a bounty" in the bot comment
3. Connect your wallet and approve USDC spending
4. Fund the bounty (minimum amount required)
5. Set a deadline for when the work should be completed
6. Wait for contributors to submit PRs

### As a Contributor

1. Find an issue with a bounty attached
2. Link your GitHub account to your wallet at `/link-wallet`
3. Submit a PR that addresses the issue
4. When your PR is merged and closes the issue, payment is automatic
5. Funds are sent to your linked wallet address

## Documentation

### Strategic

- **[Mezo Integration](docs/mezo-integration.md)** - MUSD integration strategy and roadmap

### Technical

- **[Architecture](docs/architecture.md)** - System design and technical overview
- **[Smart Contracts](docs/smart-contracts.md)** - Contract functions and integration
- **[API Documentation](docs/api.md)** - Complete API reference

### Development

- **[Local Development](docs/local-development.md)** - Setup guide for local development
- **[GitHub App Setup](docs/github-app-setup.md)** - Configuring the GitHub App
- **[Deployment](docs/deployment.md)** - Deploying to production
- **[Testing Environments](docs/testing-environments.md)** - Staging and production setup
- **[Local Database](docs/local-db.md)** - Working with SQLite database

### Support

- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[FAQ](docs/faq.md)** - Frequently asked questions

## Contributing

We love hearing from builders and maintainers.

- Open ideas or bugs via [Issues](https://github.com/lucci-xyz/bounty/issues)  
- Join discussions on new workflows or integrations  
- Submit PRs — we’ll review quickly and shout you out in the release notes

### High-Impact Ideas

- **Anti-griefing guardrails** – Prevent sponsors from copying the flow and cancelling bounties after seeing the code. Ideas welcomed: reputation, deposits, social recovery.  
- **Mezo Passport Integration** – Add native Bitcoin wallet support (Unisat, Leather) alongside EVM wallets for Mezo bounties.  
- **Multi-asset support** – Accept deposits in any token, on any Base or L2 network, and settle in the contributor's preferred asset.  
- **Proof-of-work collectibles** – Mint contribution NFTs as on-chain receipts for completed bounties.  
- **Security & audits** – Help us continuously audit contracts, bot logic, and wallet flows.  
- **New bounty mechanics** – Milestone-based unlocks, recurring grants, or team-based rewards. Surprise us.

---

## Smart Contracts

BountyPay supports multiple networks. You can choose your preferred network when creating a bounty.

### Base Sepolia Testnet

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

### Mezo Testnet

**Network Details:**
- Chain ID: `31611`
- Native Currency: BTC (Bitcoin)
- RPC URL: `https://rpc-http.mezo.boar.network` (Boar Network - reliable alternative)
- Block Explorer: [`https://explorer.test.mezo.org`](https://explorer.test.mezo.org)

> **Note:** The default RPC uses Boar Network for better reliability. You can customize this by setting `VITE_MEZO_RPC_URL` in your environment variables.

**Deployed Contracts:**

| Contract | Address | Description |
|----------|---------|-------------|
| BountyEscrow | [`0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`](https://explorer.test.mezo.org/address/0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3) | Main escrow contract for bounty funds |
| FeeVault | [`0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094`](https://explorer.test.mezo.org/address/0xa8Fc9DC3383E9E64FF9F7552a5A6B25885e5b094) | Protocol fee collection vault |
| MUSD (Test) | [`0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`](https://explorer.test.mezo.org/address/0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503) | Mezo USD stablecoin (18 decimals) |

> **Note:** Each network operates independently. Bounties created on Base Sepolia use USDC, while bounties on Mezo Testnet use MUSD. There is no bridging between networks.

Audit reports and deployment history are coming soon.

## Quick Troubleshooting

### Wallet Connection Issues

- **Wallet not connecting**: Ensure you're on the correct network:
  - Base Sepolia (Chain ID: 84532) for USDC bounties
  - Mezo Testnet (Chain ID: 31611) for MUSD bounties
- **Transaction fails**: Check you have enough native currency for gas fees:
  - Base Sepolia requires ETH
  - Mezo Testnet requires BTC
- **Token approval fails**: Verify you have sufficient token balance (USDC on Base or MUSD on Mezo)

### Payment Not Received

- **PR merged but no payment**: Verify you've linked your GitHub account to your wallet
- **Check wallet link**: Visit `/link-wallet` and ensure your GitHub account is connected
- **Verify PR closes issue**: The PR must close the issue (not just reference it)

### GitHub App Issues

- **Bot not responding**: Check the GitHub App is installed and has correct permissions
- **No "Create bounty" button**: Ensure the bot has write access to issues
- **Webhook errors**: Verify webhook URL is correctly configured in GitHub App settings

For more detailed troubleshooting, see the [Troubleshooting Guide](docs/troubleshooting.md).

## Need Help?

- 📖 Read the [FAQ](docs/faq.md) for common questions
- 🐛 Report issues on [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)
- 💬 Join discussions about features and integrations

---

Built with ❤️ using Base and Mezo.

_**Use at your own risk.** BountyPay is provided "as is" without warranties. You are responsible for the funds you deposit and the security practices you follow._
