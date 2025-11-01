# Deployment Guide

Complete guide for deploying BountyPay to production environments.

---

## Overview

BountyPay can be deployed to various platforms. This guide covers:

- Railway (currently used)
- Render
- General deployment considerations

---

## Prerequisites

- GitHub repository with the codebase
- GitHub App configured (see [GitHub App Setup](../development/github-app-setup.md))
- All environment variables ready
- Domain name (optional, but recommended)

---

## Deployment Options

### Option 1: Railway

Railway is the current deployment platform for BountyPay.

#### Step 1: Create Railway Project

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository

#### Step 2: Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

**Required:**

```bash
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-here
FRONTEND_URL=https://your-app.railway.app

GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key_content
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Base Sepolia (default)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Mezo Testnet (optional, for MUSD support)
VITE_MEZO_RPC_URL=https://mezo-testnet.drpc.org
VITE_MEZO_ESCROW_CONTRACT=0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3
VITE_MEZO_MUSD_CONTRACT=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503

RESOLVER_PRIVATE_KEY=your_resolver_private_key
```

**Note:** For `GITHUB_PRIVATE_KEY`, you can either:

- Paste the full PEM file content (with `\n` for newlines)
- Or use a secret reference if stored in Railway secrets

#### Step 3: Configure GitHub App Webhooks

1. Get your Railway deployment URL: `https://your-app.railway.app`
2. Update GitHub App settings:
   - **Webhook URL**: `https://your-app.railway.app/webhooks/github`
   - **OAuth Callback URL**: `https://your-app.railway.app/oauth/callback`
3. Update `FRONTEND_URL` environment variable to match

#### Step 4: Deploy

Railway automatically deploys when you push to the connected branch (usually `main`).

The `railway.json` configuration handles:

- Build command: Automatically detected (Nixpacks)
- Start command: `npm run migrate && npm start`
- Restart policy: On failure with max 10 retries

#### Step 5: Custom Domain (Optional)

1. In Railway dashboard, go to **Settings** → **Networking**
2. Add a custom domain
3. Update `FRONTEND_URL` and GitHub App URLs accordingly

#### Railway-Specific Tips

- **Database**: Railway offers PostgreSQL. For production, consider migrating from SQLite
- **Logs**: View real-time logs in Railway dashboard
- **Metrics**: Monitor resource usage in dashboard
- **Secrets**: Use Railway's secret management for sensitive values

---

### Option 2: Render

Render provides similar functionality to Railway with a slightly different interface.

#### Step 1: Create Render Service

1. Sign up at [render.com](https://render.com)
2. Create a new **Web Service**
3. Connect your GitHub repository

#### Step 2: Configure Service

The `render.yaml` file provides default configuration. In Render dashboard:

**Build & Deploy:**

- **Environment**: Node
- **Build Command**: `npm install` (from render.yaml)
- **Start Command**: `npm run migrate && npm start` (from render.yaml)
- **Health Check Path**: `/health` (from render.yaml)

#### Step 3: Environment Variables

Add all required environment variables in Render dashboard under **Environment**.

Render will auto-generate `SESSION_SECRET` if configured in `render.yaml`, but you still need to set:

- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `RESOLVER_PRIVATE_KEY`
- `ESCROW_CONTRACT`
- Other blockchain variables

#### Step 4: Update GitHub App

1. Get Render deployment URL: `https://your-service.onrender.com`
2. Update GitHub App webhook and callback URLs
3. Update `FRONTEND_URL` environment variable

#### Step 5: Deploy

Render automatically deploys when you push to the connected branch.

#### Render-Specific Notes

- **Free tier**: Services spin down after inactivity. Use paid plan for always-on
- **Database**: Render offers PostgreSQL. Consider migrating for production
- **Custom domains**: Free tier supports custom domains

---

### Option 3: Docker Deployment

For maximum control, you can deploy using Docker.

#### Dockerfile Example

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Run migrations and start
CMD ["sh", "-c", "npm run migrate && npm start"]
```

#### Docker Compose Example

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    volumes:
      - ./server/db:/app/server/db
    restart: unless-stopped
```

#### Deploy with Docker

```bash
# Build image
docker build -t bountypay .

# Run container
docker run -d \
  --name bountypay \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/server/db:/app/server/db \
  bountypay
```

**Docker Platforms:**

- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Fly.io
- DigitalOcean App Platform

---

## Environment Variables

### Production Checklist

All these must be set in your deployment environment:

**Server:**

- [ ] `NODE_ENV=production`
- [ ] `PORT=3000` (or platform default)
- [ ] `SESSION_SECRET` (strong random string)
- [ ] `FRONTEND_URL` (full URL with https)

**GitHub:**

- [ ] `GITHUB_APP_ID`
- [ ] `GITHUB_PRIVATE_KEY` or `GITHUB_PRIVATE_KEY_PATH`
- [ ] `GITHUB_WEBHOOK_SECRET`
- [ ] `GITHUB_CLIENT_ID`
- [ ] `GITHUB_CLIENT_SECRET`

**Blockchain (Base Sepolia):**

- [ ] `CHAIN_ID=84532`
- [ ] `RPC_URL=https://sepolia.base.org`
- [ ] `ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD`
- [ ] `USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- [ ] `RESOLVER_PRIVATE_KEY`

**Blockchain (Mezo Testnet - Optional for MUSD):**

- [ ] `VITE_MEZO_RPC_URL=https://mezo-testnet.drpc.org`
- [ ] `VITE_MEZO_ESCROW_CONTRACT=0xA6fe4832D8eBdB3AAfca86438a813BBB0Bd4c6A3`
- [ ] `VITE_MEZO_MUSD_CONTRACT=0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`

**Database:**

- [ ] `DATABASE_PATH` (if using file-based SQLite)
- Or configure managed database connection

---

## Database Considerations

### SQLite (Current)

**Pros:**

- Simple, no setup required
- Works for development and small-scale production
- Easy backups (just copy the file)

**Cons:**

- Not ideal for high concurrency
- Single file = single point of failure
- Limited scalability

**For Production:**

- Use persistent volume/storage
- Set up regular backups
- Monitor file size and performance

### PostgreSQL (Recommended for Scale)

For production at scale, consider migrating to PostgreSQL:

1. Install PostgreSQL on your platform
2. Update database connection code
3. Run migrations against PostgreSQL
4. Update environment variables

**Railway PostgreSQL:**

- Railway offers managed PostgreSQL
- Connect via connection string in environment

**Render PostgreSQL:**

- Render offers managed PostgreSQL
- Auto-generates connection string

---

## Security Best Practices

### Environment Variable Security

- **Never commit** `.env` files to git
- Use platform secret management
- Rotate secrets regularly
- Use different secrets for staging/production

### GitHub App Private Key

- Store as platform secret, not in code
- Use file path if platform supports volume mounts
- Or inline with proper escaping

### Resolver Private Key

- Use a dedicated wallet for resolver
- Keep minimal ETH balance (just enough for gas)
- Monitor balance and top up as needed
- Never use mainnet keys in test deployments

### SSL/HTTPS

- Always use HTTPS in production
- Configure SSL certificates (usually automatic on platforms)
- Update GitHub App URLs to use HTTPS

---

## Monitoring and Logging

### Health Check Endpoint

The app provides a health check at `/health`:

```bash
curl https://your-app.com/health
```

Response:

```json
{
  "status": "ok",
  "service": "bountypay-github-app",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logging

- **Platform logs**: Use built-in logging (Railway, Render dashboards)
- **Application logs**: Check console output for webhook events and errors
- **External logging**: Consider services like Logtail, Datadog, or Sentry

### Monitoring Points

- Webhook delivery success rate
- Bounty creation rate
- Payout success rate
- Resolver wallet balance
- Database size
- API response times
- Error rates

---

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://your-app.com/health
```

Should return `200 OK` with status JSON.

### 2. Test Webhook

1. Create a test issue in a repository
2. Check GitHub App → Advanced → Webhook deliveries
3. Verify delivery was successful (200 response)
4. Check server logs for processing

### 3. Test OAuth

1. Visit `https://your-app.com/link-wallet`
2. Click "Connect GitHub"
3. Verify redirect and authentication work
4. Check session is created

### 4. Test Bounty Flow

1. Create issue → Attach bounty → Fund
2. Verify database entry
3. Submit PR → Merge
4. Verify payout transaction

---

## Staging vs Production

### Staging Environment

Set up a separate staging environment:

1. Create separate GitHub App (e.g., "BountyPay-STAGE")
2. Deploy to separate service (or use environment variables)
3. Use separate database
4. Test all flows before production

**Environment Variables:**

```bash
ENV_TARGET=stage
STAGE_CALLBACK_URL=https://stage-app.com/oauth/callback
```

### Production Environment

```bash
ENV_TARGET=prod
PROD_CALLBACK_URL=https://prod-app.com/oauth/callback
```

See [Testing Environments](../development/testing-environments.md) for more details.

---

## Troubleshooting

### Deployment Fails

- Check build logs for errors
- Verify all environment variables are set
- Ensure Node.js version is 18+
- Check start command is correct

### Webhooks Not Working

- Verify webhook URL is publicly accessible
- Check SSL certificate is valid
- Verify webhook secret matches
- Check server logs for signature errors

### Database Issues

- Ensure persistent storage is configured
- Check file permissions
- Verify database path is correct
- Consider migrating to managed database

### OAuth Callback Fails

- Verify callback URL in GitHub App matches deployment URL
- Check `FRONTEND_URL` environment variable
- Ensure HTTPS is used
- Check session cookie settings

See [Troubleshooting Guide](../support/troubleshooting.md) for more issues.

---

## Backup Strategy

### Database Backups

**SQLite:**

```bash
# Manual backup
cp server/db/bounty.db backup/bounty-$(date +%Y%m%d).db

# Automated (add to cron or scheduled job)
```

**PostgreSQL:**

- Use platform backup features (Railway, Render)
- Or set up automated pg_dump

### Backup Frequency

- **Development**: Before major changes
- **Staging**: Daily
- **Production**: Multiple times daily

---

## Scaling Considerations

### Current Architecture

- Single server instance
- SQLite database
- In-memory sessions

### Scaling Path

1. **Load Balancing**: Multiple instances behind load balancer
2. **Database**: Migrate to PostgreSQL with connection pooling
3. **Sessions**: Use Redis for shared sessions
4. **Caching**: Add Redis for frequently accessed data
5. **Queue**: Add job queue for blockchain transactions (Bull, etc.)

---

## Next Steps

- [GitHub App Setup](../development/github-app-setup.md) - Configure GitHub App for production
- [Testing Environments](../development/testing-environments.md) - Set up staging
- [Architecture](../reference/architecture.md) - Understand system design
- [Troubleshooting](../support/troubleshooting.md) - Common issues and solutions
