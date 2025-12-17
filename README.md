# <img src="public/icons/og.png" alt="BountyPay logo" width="40" height="40" /> BountyPay

_Automated, trust-minimised bounty payouts for open-source contributions. Fund with USDC on Base or MUSD on Mezo and let BountyPay handle the rest._

## Get Started in Minutes

1. **Install the GitHub App**

2. **Open a New Issue** and click the `Create a bounty` button from the BountyPay bot.

3. **Choose Your Network & Fund**

- **Base Sepolia**: Fund with USDC (EVM standard)
- **Mezo Testnet**: Fund with MUSD (Bitcoin L2)

Funds sit safely in escrow.

4. **Merge the winning PR** — BountyPay automatically pays the contributor once the PR closes the issue.

That's it. No invoices, no manual transfers, no spreadsheets.

## Example Workflow

### As a Maintainer

1. Open an issue describing the work needed
2. Click "Create a bounty" in the bot comment
3. Connect your wallet and approve USDC spending
4. Fund the bounty (minimum amount required)
5. Set a deadline for when the work should be completed
6. Wait for contributors to submit PRs

For a detailed quick-start guide for maintainers, see our wiki:

[Maintainer Quickstart](https://github.com/lucci-xyz/bounty/wiki/Maintainer-Quickstart)

### As a Contributor

1. Go to [bountypay.luccilabs.xyz](https://bountypay.luccilabs.xyz) to create your account and browse available bounties
2. Find an issue with a bounty attached
3. Link your GitHub account to your wallet at `/link-wallet`
4. Submit a PR that addresses the issue
5. When your PR is merged and closes the issue, payment is automatic
6. Funds are sent to your linked wallet address

---

## Environment Variables

Key environment variables required for deployment:

### Core
- `SESSION_SECRET` — Secret for session encryption (iron-session)
- `FRONTEND_URL` — Base URL for OAuth callbacks
- `ENV_TARGET` — Environment target: `stage` or `prod`

### GitHub
- `GITHUB_APP_ID` — GitHub App ID
- `GITHUB_PRIVATE_KEY` or `GITHUB_PRIVATE_KEY_PATH` — GitHub App private key
- `GITHUB_WEBHOOK_SECRET` — Secret for GitHub App webhooks
- `GITHUB_MARKETPLACE_WEBHOOK_SECRET` — Secret for GitHub Marketplace webhooks (plan changes)
- `GITHUB_CLIENT_ID` — OAuth client ID
- `GITHUB_CLIENT_SECRET` — OAuth client secret

### Database
- `DATABASE_URL` — PostgreSQL connection string (pooled)
- `DIRECT_DATABASE_URL` — Direct connection for migrations

### Blockchain
- `BLOCKCHAIN_SUPPORTED_*_ALIASES` — Enabled network aliases (e.g., `BASE_SEPOLIA`, `MEZO_TESTNET`)
- `BLOCKCHAIN_DEFAULT_MAINNET_ALIAS` / `BLOCKCHAIN_DEFAULT_TESTNET_ALIAS` — Default networks
- `<ALIAS>_OWNER_WALLET` / `<ALIAS>_OWNER_PRIVATE_KEY` — Resolver wallets per network

For full configuration details, see `server/config.js` and `docs/reference/`.

---

_**Use at your own risk.** BountyPay is provided "as is" without warranties. You are responsible for the funds you deposit and the security practices you follow._
