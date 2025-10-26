# Local Development

Run BountyPay locally using ngrok to expose your localhost to GitHub webhooks.

---

## Prerequisites

- Node.js 18+
- GitHub App created (see [GitHub App Setup](./github-app-setup.md))
- MetaMask or Web3 wallet

---

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```bash
# Server
PORT=3000
SESSION_SECRET=generate_with_openssl_rand_hex_32

# GitHub App
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Blockchain
RESOLVER_PRIVATE_KEY=your_resolver_wallet_private_key
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org

# Frontend (update after starting ngrok)
FRONTEND_URL=http://localhost:3000
```

### 3. Fund Resolver Wallet

Get free Base Sepolia ETH:
- https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet

---

## Running with ngrok

### Install ngrok

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Setup ngrok

1. Sign up at https://ngrok.com
2. Get your auth token
3. Configure:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Start Services

**Terminal 1 - Server:**
```bash
npm run dev
```

**Terminal 2 - ngrok:**
```bash
ngrok http 3000
```

Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok-free.app`)

### Update Configuration

1. **Update `.env`:**
   ```bash
   FRONTEND_URL=https://abc123.ngrok-free.app
   ```

2. **Restart server** (Ctrl+C, then `npm run dev`)

3. **Update GitHub App settings:**
   - Homepage URL: `https://abc123.ngrok-free.app`
   - Webhook URL: `https://abc123.ngrok-free.app/webhooks/github`
   - Callback URL: `https://abc123.ngrok-free.app/oauth/callback`

---

## Testing

### Test Health Check
```bash
curl https://your-ngrok-url.ngrok-free.app/health
```

### Test Bot Comment
1. Open an issue in your connected repo
2. Bot should comment within 5 seconds

### Test Bounty Flow
1. Click "Attach Bounty" on issue
2. Connect wallet
3. Fund bounty (requires test USDC)
4. Bot posts bounty summary

### Get Test USDC
- https://faucet.circle.com/

---

## Development Tips

### View Logs
```bash
# Server logs
npm run dev

# ngrok dashboard
open http://localhost:4040
```

### Database
```bash
# View database
sqlite3 server/db/bounty.db

# Check bounties
SELECT * FROM bounties;

# Exit
.quit
```

### Auto-reload
Server uses `--watch` flag and restarts automatically on file changes.

---

## Common Issues

### ngrok URL changes
Free ngrok URLs change on restart. You'll need to:
1. Copy new URL
2. Update `.env`
3. Update GitHub App settings
4. Restart server

**Solution**: Use ngrok's paid plan for static domains

### Webhook fails
- Check ngrok is running
- Verify webhook secret matches
- View deliveries in GitHub App → Advanced

### Wallet connection fails
- Install MetaMask
- Switch to Base Sepolia network
- Check browser console for errors

---

## Next Steps

Once local development works:
- [Deploy to production](./deployment.md)
- [Understand the architecture](./architecture.md)

