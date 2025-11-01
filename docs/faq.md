# Frequently Asked Questions

Common questions about BountyPay.

---

## General

### What is BountyPay?

BountyPay is an automated bounty payment system for GitHub issues. Sponsors can attach USDC bounties to issues, and contributors are automatically paid when their PR merges and closes the issue.

### How does it work?

1. Sponsor opens a GitHub issue
2. Sponsor attaches a USDC bounty via the BountyPay bot
3. Contributor links their GitHub account to their wallet
4. Contributor submits a PR that addresses the issue
5. When PR merges and closes the issue, payment is automatic

### Is it free to use?

The platform itself is free. However:
- Sponsors pay gas fees for creating bounties
- Contributors receive the full bounty amount (minus protocol fee)
- Protocol fees go to maintain the platform

### What networks does it support?

Currently deployed on **Base Sepolia** (testnet). Mainnet deployment coming soon.

---

## For Sponsors

### How do I create a bounty?

1. Open a GitHub issue
2. Look for the BountyPay bot comment with "Create a bounty" button
3. Click the button and connect your wallet
4. Approve USDC spending and fund the bounty
5. Set a deadline for completion

### What happens if no one solves the issue?

If the deadline passes and the issue isn't resolved, you can refund the bounty and get your USDC back.

### Can I cancel a bounty?

Yes, you can cancel an open bounty before the deadline and retrieve your funds.

### Can I increase the bounty amount?

Yes, you can top up an existing open bounty at any time.

### Who decides if a PR qualifies?

The PR must actually **close** the issue (using "Closes #issue" or "Fixes #issue" in the PR description). If it closes the issue, the payment is automatic.

### What if multiple PRs close the issue?

The first PR that closes the issue gets the payment. If multiple PRs are merged simultaneously, the one processed first receives the bounty.

---

## For Contributors

### How do I get paid?

1. Link your GitHub account to your wallet at `/link-wallet`
2. Find an issue with a bounty attached
3. Submit a PR that closes the issue (use "Closes #issue" in PR description)
4. When your PR is merged and closes the issue, payment is automatic

### Do I need to link my wallet?

Yes, you must link your GitHub account to your wallet address before you can receive payments. The system needs to know where to send the USDC.

### Can I change my linked wallet?

Currently, each GitHub account can only link to one wallet address. If you need to change it, contact support.

### What if my PR doesn't close the issue?

Your PR must actually close the issue (not just reference it). If it doesn't close the issue, you won't receive the payment.

### When do I get paid?

Payment happens automatically when:
1. Your PR is merged
2. The PR closes the bounty issue
3. Your wallet is linked to your GitHub account

The payment is typically processed within a few seconds of the PR merge.

### Do I need to request payment?

No, payment is fully automated. You don't need to submit invoices or request payment.

---

## Technical

### What is Base Sepolia?

Base Sepolia is the testnet for Base, a Layer 2 blockchain built on Ethereum. It's used for testing before mainnet deployment.

### How do I get test USDC?

Test USDC is available on Base Sepolia. You may need to:
- Use a faucet to get test tokens
- Bridge from Ethereum Sepolia
- Request from the team

### What wallets are supported?

Any wallet that supports Ethereum and can connect to Base Sepolia:
- MetaMask (recommended)
- WalletConnect
- Coinbase Wallet
- Other EIP-1193 compatible wallets

### How much gas do transactions cost?

Base Sepolia has very low gas fees (typically < $0.01 per transaction). You'll need Base Sepolia ETH for gas fees.

### Are the contracts audited?

The contracts use OpenZeppelin's audited libraries. Full security audits are planned before mainnet deployment.

### Is my wallet address public?

When you link your wallet, the mapping between your GitHub account and wallet address is stored. This is necessary for payments to work. The system does not store private keys.

---

## Security

### Is it safe?

- Funds are held in audited smart contracts
- Only designated resolvers can pay out (not random addresses)
- Sponsors can cancel/refund if needed
- Contracts use industry-standard security practices (OpenZeppelin)

### What if the resolver wallet is compromised?

The resolver is controlled by the BountyPay backend. If compromised:
- Only open bounties could be resolved (not closed ones)
- Sponsors could still cancel/refund
- We monitor resolver wallet activity

### Can bounties be stolen?

No. Once a bounty is created, only:
- The sponsor can cancel/refund
- The designated resolver can pay out (to the PR author)

No one else can move the funds.

### What about smart contract bugs?

We use OpenZeppelin's battle-tested contracts. Before mainnet, we'll conduct full security audits.

---

## Troubleshooting

### My transaction failed

Common causes:
- Insufficient gas (need Base Sepolia ETH)
- Insufficient USDC balance
- USDC not approved
- Wrong network (must be Base Sepolia, Chain ID 84532)

See [Troubleshooting Guide](troubleshooting.md) for more help.

### Payment didn't arrive

Check:
1. Is your wallet linked? Visit `/link-wallet`
2. Did your PR actually close the issue?
3. Was your PR merged?
4. Check your wallet on BaseScan

### The bot isn't responding

- Verify the GitHub App is installed on your repository
- Check the app has write access to issues
- Verify webhooks are configured correctly

See [Troubleshooting Guide](troubleshooting.md) for more help.

---

## Development

### Can I contribute to BountyPay?

Yes! We welcome contributions. See the [Contributing](README.md#contributing) section.

### How do I set up local development?

See the [Local Development Guide](local-development.md) for complete setup instructions.

### Can I deploy my own instance?

Yes, the code is open source. See the [Deployment Guide](deployment.md) for instructions.

### What's the tech stack?

- **Backend**: Node.js, Express
- **Database**: SQLite (PostgreSQL recommended for scale)
- **Blockchain**: ethers.js v6
- **Authentication**: SIWE, GitHub OAuth
- **Smart Contracts**: Solidity, OpenZeppelin

---

## Business Model

### How does BountyPay make money?

Protocol fees are collected on bounty resolutions. A small percentage goes to the FeeVault for platform maintenance.

### What's the protocol fee?

Currently set to a reasonable percentage. The maximum is capped at 10%. See contract documentation for exact fee.

### Who pays the fee?

The fee is deducted from the bounty amount before payout. The contributor receives the net amount.

---

## Limitations

### Current Limitations

- Only supports USDC (testnet)
- Only Base Sepolia (testnet)
- Single wallet per GitHub account
- First PR to close issue wins (no splitting)

### Planned Improvements

- Multi-token support
- Mainnet deployment
- Multiple networks
- Milestone-based bounties
- Dispute resolution
- Team bounties

See [Architecture](architecture.md#future-enhancements) for the full roadmap.

---

## Support

### Where can I get help?

- **Documentation**: Check the [docs](README.md#documentation) section
- **Issues**: [GitHub Issues](https://github.com/lucci-xyz/bounty/issues)
- **Discussions**: GitHub Discussions
- **Troubleshooting**: [Troubleshooting Guide](troubleshooting.md)

### How do I report a bug?

Open an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details

### How do I request a feature?

Open a discussion or issue on GitHub. We love hearing new ideas!

---

## Legal

### Is this legal?

BountyPay is a tool for facilitating payments. Users are responsible for:
- Compliance with local laws
- Tax obligations
- Validating contributors' work

### Terms of service?

Use at your own risk. See the disclaimer in the README.

---

## Next Steps

- [Getting Started](README.md#get-started-in-minutes) - Quick start guide
- [Local Development](local-development.md) - Set up your environment
- [Troubleshooting](troubleshooting.md) - Solve common issues
- [Architecture](architecture.md) - Understand the system

