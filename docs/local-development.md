# Local Development Setup

Complete guide for setting up BountyPay locally for development and testing.

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ and npm (or yarn/pnpm)
- **Git** for cloning the repository
- **A GitHub account** with admin access to repositories for testing
- **A crypto wallet** (MetaMask recommended) with Base Sepolia testnet configured
- **ngrok** (or similar) for exposing local server to GitHub webhooks
- **SQLite** (usually comes with system, or install separately)

---

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/lucci-xyz/bounty.git
cd bounty

# Install dependencies
npm install
```

---

## Step 2: Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env  # If an example exists, or create from scratch
```

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000
SESSION_SECRET=your-secret-session-key-here

# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Blockchain Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
RESOLVER_PRIVATE_KEY=your_resolver_wallet_private_key

# Database (optional, defaults to ./server/db/bounty.db)
DATABASE_PATH=./server/db/bounty.db
```

### Generating Required Values

**SESSION_SECRET:**

```bash
openssl rand -hex 32
```

**GITHUB_WEBHOOK_SECRET:**

```bash
openssl rand -hex 32
```

**GitHub App Setup:**
See [GitHub App Setup Guide](github-app-setup.md) for detailed instructions on obtaining:

- `GITHUB_APP_ID`
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Private key file path

**RESOLVER_PRIVATE_KEY:**

- Create a new wallet for the resolver (use a test account)
- Export the private key (without `0x` prefix or with it, both work)
- This wallet needs Base Sepolia ETH for gas fees

---

## Step 3: Database Setup

The database is automatically initialized when the server starts. However, you can manually run migrations:

```bash
npm run migrate
```

This creates the SQLite database at `server/db/bounty.db` (or your configured `DATABASE_PATH`).

### Database Schema

The database includes three main tables:

- `bounties` - Stores all bounty information
- `wallet_mappings` - Links GitHub users to wallet addresses
- `pr_claims` - Tracks PR claims on bounties

See [Local Database Guide](local-db.md) for working with the database.

---

## Step 4: GitHub App Configuration

### Create GitHub App

Follow the [GitHub App Setup Guide](github-app-setup.md) to create and configure your GitHub App.

### Local Webhook Setup with ngrok

Since GitHub requires a publicly accessible webhook URL, use ngrok for local development:

**Install ngrok:**

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

**Start ngrok:**

```bash
# In a separate terminal
ngrok http 3000
```

You'll get a URL like `https://abc123.ngrok.io`. Use this for:

1. **GitHub App Webhook URL:**

   ```plaintext
   https://abc123.ngrok.io/webhooks/github
   ```

2. **OAuth Callback URL:**

   ```plaintext
   https://abc123.ngrok.io/oauth/callback
   ```

**Note:** Free ngrok URLs change on restart. For stable URLs during development, consider:

- Using ngrok.yml with an authtoken (see `ngrok.yml` in repo root)
- Getting a paid ngrok plan
- Using a service like Cloudflare Tunnel or localtunnel

### Update Environment Variables

Update your `.env` with the ngrok URL:

```bash
FRONTEND_URL=https://abc123.ngrok.io
```

---

## Step 5: Start Development Server

```bash
npm run dev
```

The server will:

- Initialize the database (if needed)
- Start on `http://localhost:3000`
- Enable file watching for automatic restarts

You should see:

```plaintext
🚀 Starting BountyPay GitHub App...
✅ Database ready
✅ GitHub App initialized
✅ Server running on port 3000
   Frontend: http://localhost:3000
   Webhooks: http://localhost:3000/webhooks/github
```

---

## Step 6: Testing the Setup

### 1. Test Webhook Connection

1. Create a test repository (or use an existing one)
2. Install your GitHub App on the repository
3. Create a new issue in the repository
4. Check server logs - you should see:

   ```plaintext
   📬 Webhook received: issues (delivery-id)
   ```

5. Verify a comment was posted on the issue

### 2. Test Frontend Pages

Visit these URLs:

- `http://localhost:3000` - Landing page
- `http://localhost:3000/attach-bounty?repo=owner/repo&issue=1` - Bounty attachment page
- `http://localhost:3000/link-wallet` - Wallet linking page
- `http://localhost:3000/refund` - Refund page

### 3. Test Wallet Connection

1. Visit `http://localhost:3000/link-wallet`
2. Connect your wallet (MetaMask)
3. Switch to Base Sepolia network (Chain ID 84532)
4. Sign the SIWE message
5. Verify wallet is linked

### 4. Test Bounty Creation

1. Create an issue in a test repository
2. Click "Create a bounty" button (from bot comment)
3. Connect wallet on the attach-bounty page
4. Approve USDC spending
5. Fund the bounty
6. Verify transaction succeeds and bounty is created

---

## Development Workflow

### File Structure

```plaintext
server/
├── index.js           # Main server entry
├── config.js          # Configuration
├── routes/
│   ├── api.js        # API endpoints
│   └── oauth.js      # OAuth routes
├── github/
│   ├── client.js     # GitHub App client
│   └── webhooks.js   # Webhook handlers
├── blockchain/
│   └── contract.js   # Smart contract interface
├── auth/
│   └── siwe.js       # SIWE authentication
└── db/
    ├── index.js      # Database initialization
    ├── schema.js     # Database schema
    └── migrate.js     # Migration script
```

### Hot Reload

The `npm run dev` command uses Node's `--watch` flag for automatic restarts on file changes.

### Debugging

**Enable debug logging:**

```bash
DEBUG=* npm run dev
```

**Check database:**

```bash
sqlite3 server/db/bounty.db
# Then run SQL queries
```

**View webhook deliveries:**

- Check GitHub App settings → Advanced → Webhook deliveries
- Check server logs for webhook processing

---

## Testing Tips

### Test with Base Sepolia

1. Get Base Sepolia ETH:
   - Use a faucet: <https://www.coinbase.com/faucets/base-ethereum-goerli-faucet>
   - Bridge from Ethereum Sepolia

2. Get Test USDC:
   - The test USDC contract is at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - You may need to mint or obtain test USDC for your test wallet

### Test Bounty Flow

1. **Sponsor flow:**
   - Create issue → Attach bounty → Fund → Verify database entry

2. **Contributor flow:**
   - Link wallet → Submit PR → Merge PR → Verify payment

3. **Refund flow:**
   - Create bounty → Wait past deadline → Call refund → Verify refund

### Common Test Scenarios

- Multiple bounties on same issue
- PR that doesn't close issue (should not trigger payout)
- Bounty with expired deadline
- Wallet linking for multiple GitHub accounts
- Webhook retry scenarios

---

## Common Development Issues

### Port Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Database Locked

```bash
# Close any open SQLite connections
# Or delete and recreate:
rm server/db/bounty.db
npm run migrate
```

### Webhook Signature Verification Fails

- Verify `GITHUB_WEBHOOK_SECRET` matches GitHub App settings
- Ensure raw body is preserved (already handled in code)
- Check ngrok URL hasn't changed

### Blockchain Connection Issues

- Verify RPC URL is correct: `https://sepolia.base.org`
- Check resolver wallet has Base Sepolia ETH
- Verify contract addresses are correct

### OAuth Callback Fails

- Ensure callback URL in GitHub App matches ngrok URL
- Check `FRONTEND_URL` in `.env` matches ngrok URL
- Verify client ID and secret are correct

---

## Next Steps

- [GitHub App Setup](github-app-setup.md) - Detailed GitHub App configuration
- [Architecture](architecture.md) - Understand system design
- [API Documentation](api.md) - API endpoint reference
- [Troubleshooting](troubleshooting.md) - Solutions to common issues

---

## Development Scripts

```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Run database migrations
npm run migrate

# Seed database (if seed script exists)
npm run seed
```

---

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- SQLite Viewer

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/server/index.js",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

---

## Additional Resources

- [Base Sepolia Network Info](https://docs.base.org/base-camp/docs/networks/base-sepolia)
- [ethers.js Documentation](https://docs.ethers.org/)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
