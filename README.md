# ![BountyPay logo](public/icons/og.png) BountyPay

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

### Quick Links

- **[Getting Started](docs/getting-started.md)** - Complete guide for sponsors and contributors
- **[Smart Contract Addresses](docs/contracts.md)** - Deployed contracts on Base and Mezo
- **[Contributing](docs/contributing.md)** - How to contribute to BountyPay
- **[FAQ](docs/faq.md)** - Frequently asked questions
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

### For Developers

- **[Smart Contracts Reference](docs/smart-contracts.md)** - Technical documentation for contracts
- **[Architecture](docs/architecture.md)** - System design and technical overview
- **[API Documentation](docs/api.md)** - Complete API reference
- **[Local Development](docs/local-development.md)** - Setup guide for local development
- **[Deployment](docs/deployment.md)** - Deploying to production
- **[GitHub App Setup](docs/github-app-setup.md)** - Configuring the GitHub App

---

## Need Help?

- 📖 Read the [Getting Started Guide](docs/getting-started.md) or [FAQ](docs/faq.md)
- 💬 Join discussions about features and integrations
- 🐛 Report issues on [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)

---

Built with ❤️ using Base and Mezo.

_**Use at your own risk.** BountyPay is provided "as is" without warranties. You are responsible for the funds you deposit and the security practices you follow._
