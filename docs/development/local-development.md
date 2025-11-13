# Local Development Setup

Complete guide for setting up BountyPay locally for development and testing.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git** for cloning the repository
- **A GitHub account** with admin access to repositories for testing
- **A crypto wallet** (MetaMask recommended) with Base Sepolia testnet configured
- **ngrok** (or similar) for exposing local server to GitHub webhooks

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
# Required
SESSION_SECRET=your-random-32-char-string
FRONTEND_URL=http://localhost:3000
ENV_TARGET=stage

# GitHub App
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Blockchain
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
RESOLVER_PRIVATE_KEY=your_resolver_wallet_private_key

# Database (Prisma Postgres)
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=...
DIRECT_DATABASE_URL=postgres://...@db.prisma.io:5432/postgres?sslmode=require

# Optional
NEXT_PUBLIC_MEZO_RPC_URL=https://mezo-testnet.drpc.org
```

### Generating Required Values

**SESSION_SECRET & GITHUB_WEBHOOK_SECRET:**

```bash
openssl rand -hex 32
```

**GitHub App Setup:**
See [GitHub App Setup Guide](github-app-setup.md) for obtaining:
- `GITHUB_APP_ID`
- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- `GITHUB_PRIVATE_KEY`

**RESOLVER_PRIVATE_KEY:**
- Create a new wallet for the resolver (test account)
- Export the private key
- This wallet needs Base Sepolia ETH for gas fees

---

## Step 3: Database Setup

### Create Prisma Postgres Database

1. Go to [Prisma Data Platform](https://console.prisma.io/)
2. Create a new Postgres database
3. Copy the connection strings to your `.env`:
   - `DATABASE_URL` - Accelerate connection (for queries)
   - `DIRECT_DATABASE_URL` - Direct connection (for migrations)

### Initialize Database Tables

```bash
npx prisma db push
```

This creates all tables (`bounties`, `wallet_mappings`, `pr_claims`) in your Postgres database.

### Generate Prisma Client

```bash
npx prisma generate
```

---

## Step 4: GitHub App Configuration

### Create GitHub App

Follow the [GitHub App Setup Guide](github-app-setup.md) to create and configure your GitHub App.

### Local Webhook Setup with ngrok

**Install ngrok:**

```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

**Start ngrok:**

```bash
ngrok http 3000
```

You'll get a URL like `https://abc123.ngrok.io`. Use this for:

1. **GitHub App Webhook URL:**
   ```
   https://abc123.ngrok.io/api/webhooks/github
   ```

2. **OAuth Callback URL:**
   ```
   https://abc123.ngrok.io/api/oauth/callback
   ```

**Update `.env` with ngrok URL:**

```bash
FRONTEND_URL=https://abc123.ngrok.io
```

---

## Step 5: Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (accessible via ngrok URL).

You should see:

```
▲ Next.js 15.x.x
- Local:        http://localhost:3000
- Network:      ...

✓ Ready in 2s
```

---

## Step 6: Testing the Setup

### 1. Test Webhook Connection

1. Install your GitHub App on a test repository
2. Create a new issue
3. Check server logs - you should see webhook processing
4. Verify a comment was posted on the issue

### 2. Test Frontend Pages

- `http://localhost:3000` - Landing page
- `http://localhost:3000/attach-bounty?repo=owner/repo&issue=1` - Bounty page
- `http://localhost:3000/link-wallet` - Wallet linking

### 3. Test Wallet Connection

1. Visit `/link-wallet`
2. Connect wallet (MetaMask)
3. Switch to Base Sepolia (Chain ID 84532)
4. Sign the SIWE message
5. Verify wallet is linked

### 4. Test Bounty Creation

1. Create an issue
2. Click "Create a bounty" button
3. Connect wallet
4. Approve USDC spending
5. Fund the bounty
6. Verify transaction and database entry

---

## Development Workflow

### Project Structure

```
app/                    # Next.js App Router
├── api/               # API routes
│   ├── bounty/
│   ├── wallet/
│   ├── oauth/
│   └── webhooks/
├── attach-bounty/     # Bounty funding page
├── link-wallet/       # Wallet linking page
└── layout.jsx         # Root layout

server/                # Backend logic
├── config.js          # Configuration
├── github/            # GitHub integration
├── blockchain/        # Smart contract interface
├── auth/              # SIWE authentication
└── db/
    └── prisma.js      # Database queries

prisma/
└── schema.prisma      # Database schema

components/            # React components
config/                # Frontend config
```

### Hot Reload

Next.js automatically reloads on file changes during development.

### Debugging

**Check database:**

```bash
npx prisma studio
```

This opens a GUI for viewing/editing database records.

**View webhook deliveries:**
- GitHub App settings → Advanced → Webhook deliveries

---

## Common Development Issues

### Port Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Prisma Client Not Generated

```bash
npx prisma generate
```

### Webhook Signature Verification Fails

- Verify `GITHUB_WEBHOOK_SECRET` matches GitHub App settings
- Check ngrok URL hasn't changed

### Blockchain Connection Issues

- Verify RPC URL: `https://sepolia.base.org`
- Check resolver wallet has Base Sepolia ETH
- Verify contract addresses are correct

### OAuth Callback Fails

- Ensure callback URL in GitHub App matches ngrok URL
- Check `FRONTEND_URL` in `.env` matches ngrok URL
- Verify client ID and secret are correct

---

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Open Prisma Studio
npx prisma studio
```

---

## Next Steps

- [GitHub App Setup](github-app-setup.md) - Detailed GitHub App configuration
- [Architecture](../reference/architecture.md) - Understand system design
- [API Documentation](../reference/api.md) - API endpoint reference
- [Troubleshooting](../support/troubleshooting.md) - Solutions to common issues
