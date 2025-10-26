# BountyPay

Automated bounty payments for GitHub issues using USDC on Base.

## Overview

BountyPay connects GitHub issues with blockchain bounties. Sponsors fund issues with USDC, contributors solve them, and payments happen automatically when pull requests are merged.

**Live on Base Sepolia testnet**

---

## Features

- 💰 **Attach Bounties** - Fund GitHub issues with USDC
- 🔗 **Wallet Linking** - Connect GitHub accounts to crypto wallets
- ⚡ **Auto Payments** - Instant payouts when PRs merge
- 🤖 **GitHub Integration** - Bot automation via webhooks
- 🔐 **Secure** - Smart contract escrow on Base

---

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: HTML + ethers.js
- **Blockchain**: Base Sepolia + USDC
- **Auth**: GitHub OAuth + SIWE

---


## Documentation

- **[GitHub App Setup](./docs/github-app-setup.md)** - Create and configure your GitHub App
- **[Local Development](./docs/local-development.md)** - Run locally with ngrok
- **[Deployment](./docs/deployment.md)** - Deploy to Railway or other platforms
- **[Architecture](./docs/architecture.md)** - System design and data flows

---

## Project Structure

```
bounty/
├── server/              # Backend application
│   ├── db/             # Database and queries
│   ├── github/         # GitHub integration
│   ├── blockchain/     # Smart contract interaction
│   ├── auth/           # SIWE authentication
│   └── routes/         # API endpoints
├── public/             # Frontend pages
├── contracts/          # Smart contracts (deployed)
├── docs/              # Documentation
└── package.json
```

---

## Smart Contracts

**Network**: Base Sepolia (Chain ID: 84532)

| Contract | Address |
|----------|---------|
| BountyEscrow | `0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD` |
| FeeVault | `0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3` |
| USDC (Test) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT

---

## Support

- **Documentation**: See [docs/](./docs/)
- **Issues**: Open a GitHub issue
- **Contract**: [View on BaseScan](https://sepolia.basescan.org/address/0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD)

---

Built with ❤️ using Base
