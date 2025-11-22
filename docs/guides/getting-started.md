# Getting Started with BountyPay

Complete guide for sponsors and contributors to use BountyPay.

---

## Quick Start

### 1. Install the GitHub App

[Download BountyPay](https://github.com/apps/bountypay)

Install the app on your repository or organization to enable bounty creation.

### 2. Open a New Issue

Create an issue describing the work needed, then click the `Create a bounty` button from the BountyPay bot comment.

### 3. Choose Your Network & Fund

- **Base Sepolia**: Fund with USDC (EVM standard)
- **Mezo Testnet**: Fund with MUSD (Bitcoin L2)

Funds sit safely in escrow until the issue is resolved.

### 4. Merge the Winning PR

BountyPay automatically pays the contributor once the PR closes the issue.

That's it. No invoices, no manual transfers, no spreadsheets.

---

## Detailed Workflow

### As a Sponsor

1. **Open an issue** describing the work needed
2. **Click "Create a bounty"** in the bot comment
3. **Connect your wallet** and approve token spending (USDC or MUSD)
4. **Fund the bounty** with the desired amount (minimum amount required)
5. **Set a deadline** for when the work should be completed
6. **Wait for contributors** to submit PRs

**After PR Submission:**

- Review submitted PRs
- Merge the winning PR that closes the issue
- BountyPay automatically pays the contributor
- Or reclaim funds after deadline if issue isn't resolved

### As a Contributor

1. **Find an issue** with a bounty attached
2. **Link your GitHub account** to your wallet at `/link-wallet`
3. **Submit a PR** that addresses the issue
4. **Get it merged** - when your PR closes the issue, payment is automatic
5. **Receive funds** in your linked wallet address

**Tips for Contributors:**

- Ensure your PR actually closes the issue (use "Closes #123" in description)
- Link your wallet before submitting your PR
- Make sure you're on the correct network (Base Sepolia or Mezo Testnet)
- Check the bounty deadline before starting work

---

## Network Selection

BountyPay supports multiple networks. Choose based on your preferred token:

### Base Sepolia Testnet

- **Token**: USDC (6 decimals)
- **Chain ID**: 84532
- **Native Currency**: ETH
- **RPC URL**: `https://sepolia.base.org`
- **Block Explorer**: [sepolia.basescan.org](https://sepolia.basescan.org)

**Best for:**
- Users familiar with Ethereum/EVM
- Standard USDC holders
- Quick setup with MetaMask

### Mezo Testnet

- **Token**: MUSD (18 decimals)
- **Chain ID**: 31611
- **Native Currency**: BTC (Bitcoin)
- **RPC URL**: `https://mezo-testnet.drpc.org`
- **Block Explorer**: [explorer.test.mezo.org](https://explorer.test.mezo.org)

**Best for:**
- Bitcoin holders wanting to maintain BTC exposure
- Users exploring Bitcoin L2 solutions
- Projects aligned with Bitcoin ecosystem

> **Note:** Each network operates independently. Bounties created on Base use USDC, while bounties on Mezo use MUSD. There is no bridging between networks.

---

## Wallet Setup

### Link Your Wallet

1. Visit `/link-wallet` on the BountyPay app
2. Click "Connect GitHub"
3. Authorize the OAuth connection
4. Click "Connect Wallet"
5. Sign the SIWE (Sign-In With Ethereum) message
6. Your GitHub account is now linked to your wallet address

**Supported Wallets:**

- MetaMask
- WalletConnect-compatible wallets
- Rainbow
- Coinbase Wallet
- Any EVM-compatible wallet

### Switch Networks

Most wallets will prompt you to switch networks automatically. If not:

**For Base Sepolia:**
1. Open wallet settings
2. Add network with Chain ID 84532
3. Enter RPC URL: `https://sepolia.base.org`

**For Mezo Testnet:**
1. Open wallet settings
2. Add network with Chain ID 31611
3. Enter RPC URL: `https://mezo-testnet.drpc.org`

---

## Funding Your Bounty

### Token Approval

Before creating a bounty, you'll need to approve token spending:

**Base Sepolia (USDC):**
1. Connect to Base Sepolia network
2. Approve USDC spending for escrow contract
3. Confirm transaction in your wallet

**Mezo Testnet (MUSD):**
1. Connect to Mezo Testnet network
2. Approve MUSD spending for escrow contract
3. Confirm transaction in your wallet

### Creating the Bounty

1. Click "Create a bounty" button
2. Enter bounty amount (minimum required)
3. Set deadline (Unix timestamp)
4. Confirm transaction
5. Wait for transaction confirmation

### Adding More Funds

You can top up an existing bounty:

1. Navigate to the issue
2. Click "Add funds" in bot comment
3. Enter additional amount
4. Confirm transaction

---

## Managing Bounties

### Cancel Before Deadline

Sponsors can cancel open bounties before the deadline:

1. Click "Cancel bounty" in the issue
2. Confirm cancellation
3. Funds are returned to your wallet

### Reclaim After Deadline

If no PR resolves the issue by the deadline:

1. Wait for deadline to pass
2. Click "Reclaim funds" in the issue
3. Confirm transaction
4. Funds are returned to your wallet

---

## Common Scenarios

### Multiple Bounties on One Issue

- Multiple sponsors can add bounties to the same issue
- Each bounty is independent
- Contributors receive all bounties when PR merges
- Each sponsor manages their own bounty

### Bounty Deadline Expires

- Issue remains open after deadline
- Sponsors can reclaim their funds
- New bounties can be created with new deadlines
- Contributors who started work can still submit PRs (but won't be paid from expired bounties)

### PR Merged Without Closing Issue

- Payment only triggers when PR closes the issue
- Use "Closes #123" or "Fixes #123" in PR description
- Maintainers can manually close issue and trigger payment

---

## Troubleshooting

### Wallet Not Connecting

- Ensure you're on the correct network
- Check wallet is unlocked
- Try refreshing the page
- Check browser console for errors

### Transaction Fails

- Check you have enough native currency for gas (ETH on Base, BTC on Mezo)
- Verify token approval was successful
- Ensure bounty parameters are valid (deadline in future, amount > 0)

### Payment Not Received

- Verify your GitHub account is linked to a wallet
- Check the PR actually closed the issue
- View transaction on block explorer
- Contact support if issue persists

For more detailed troubleshooting, see the [Troubleshooting Guide](../support/troubleshooting.md).

---

## Next Steps

- **[Smart Contracts](../reference/smart-contracts.md)** - Technical details about the contracts
- **[API Documentation](../reference/api.md)** - Integration reference
- **[FAQ](../support/faq.md)** - Frequently asked questions
- **[Troubleshooting](../support/troubleshooting.md)** - Common issues and solutions
