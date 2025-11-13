# Vercel Deployment Guide

Complete guide for deploying BountyPay to Vercel.

---

## Why Vercel?

✅ **Next.js Optimized** - Built by the creators of Next.js  
✅ **Zero Configuration** - Automatic detection and setup  
✅ **Global CDN** - Fast worldwide performance  
✅ **Automatic Scaling** - Handles traffic spikes seamlessly  
✅ **Preview Deployments** - Every PR gets a unique URL  
✅ **Free Tier** - Generous limits for development  

---

## Quick Start (5 Minutes)

### 1. Connect Repository

```bash
# Push your code to GitHub
git push origin main
```

Then:
1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. Vercel auto-detects Next.js ✅

### 2. Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
SESSION_SECRET=your-random-32-char-string
ENV_TARGET=stage
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=Iv1.xxx
GITHUB_CLIENT_SECRET=xxx
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
RESOLVER_PRIVATE_KEY=0x...
FRONTEND_URL=https://your-app.vercel.app

# Optional
NEXT_PUBLIC_MEZO_RPC_URL=https://mezo-testnet.drpc.org
```

### 3. Deploy

Click **"Deploy"** - Done! 🎉

Your app will be live at `https://your-app.vercel.app`

### 4. Create Vercel Postgres Database

**CRITICAL:** The app requires a Postgres database for persistent storage.

1. In Vercel Dashboard → **Storage** tab
2. Click **"Create Database"** → **"Postgres"**
3. Name it `bountypay-db`
4. Click **"Create"**

Vercel will automatically add environment variables with your database prefix:
- `BOUNTY_POSTGRES_URL`
- `BOUNTY_PRISMA_DATABASE_URL`
- `BOUNTY_DATABASE_URL`
- And others...

**Note:** The app is configured to use `BOUNTY_POSTGRES_URL`. Database tables are automatically created on first use.

### 5. Set ENV_TARGET (Important!)

Add this environment variable to distinguish stage from production:

```bash
# For staging
ENV_TARGET=stage

# For production
ENV_TARGET=prod
```

This ensures bounties created in staging don't interfere with production (since they use separate GitHub Apps).

### 6. Update GitHub App

Update your GitHub App settings:
- Webhook URL: `https://your-app.vercel.app/api/webhooks/github`
- OAuth Callback: `https://your-app.vercel.app/api/oauth/callback`

---

## Environment Variables Reference

### Core Application

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ | Random string for session encryption (32+ chars) |
| `ENV_TARGET` | ✅ | Environment identifier: `stage` or `prod` |
| `FRONTEND_URL` | ✅ | Your Vercel deployment URL |
| `NODE_ENV` | Auto | Set to `production` automatically |

### GitHub Integration

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | ✅ | Your GitHub App ID |
| `GITHUB_PRIVATE_KEY` | ✅ | GitHub App private key (full PEM) |
| `GITHUB_WEBHOOK_SECRET` | ✅ | Webhook secret from GitHub App |
| `GITHUB_CLIENT_ID` | ✅ | OAuth client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | OAuth client secret |

### Blockchain

| Variable | Required | Description |
|----------|----------|-------------|
| `CHAIN_ID` | ✅ | Default: 84532 (Base Sepolia) |
| `RPC_URL` | ✅ | Default: https://sepolia.base.org |
| `ESCROW_CONTRACT` | ✅ | Escrow contract address |
| `USDC_CONTRACT` | Auto | Default: Base Sepolia USDC |
| `RESOLVER_PRIVATE_KEY` | ✅ | Wallet private key for resolving bounties |

### Optional

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_MEZO_RPC_URL` | ❌ | Custom Mezo testnet RPC |
| `DATABASE_PATH` | ❌ | Custom SQLite path (default: /tmp) |

---

## Automatic Features

Vercel automatically handles:

✅ **SSL Certificates** - HTTPS enabled automatically  
✅ **Build Detection** - Recognizes Next.js and configures build  
✅ **API Routes** - Deployed as serverless functions  
✅ **Static Assets** - Served from global CDN  
✅ **Environment Variables** - Encrypted and secure  
✅ **Preview Deployments** - Every PR gets a URL  
✅ **Rollbacks** - Instant rollback to any previous version  

---

## Preview Deployments

Every pull request automatically gets:

- **Unique URL**: `https://your-app-git-branch-name.vercel.app`
- **Full functionality**: Complete environment
- **PR Comments**: Vercel comments on PR with deployment link
- **Independent**: Doesn't affect production

### Test Your PR

```bash
git checkout -b feature-branch
git push origin feature-branch

# Create PR on GitHub
# Vercel automatically creates preview deployment
# Click the link in PR comments to test
```

---

## Production Deployment

### Automatic Deployment

```bash
git checkout main
git merge feature-branch
git push origin main

# Vercel automatically deploys to production
```

### Manual Deployment

In Vercel dashboard:
1. Go to **Deployments**
2. Click **"Redeploy"** on any previous deployment
3. Or trigger from specific branch

---

## Custom Domain

### Add Custom Domain

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your domain (e.g., `bounty.yourdomain.com`)
3. Update DNS records:

```
Type: CNAME
Name: bounty
Value: cname.vercel-dns.com
```

4. Wait for DNS propagation (usually < 5 minutes)
5. Update environment variables:

```bash
FRONTEND_URL=https://bounty.yourdomain.com
```

6. Update GitHub App URLs to use custom domain

---

## Database Considerations

### SQLite (Default)

**Pros:**
- Simple, no external service
- Works out of the box

**Cons:**
- Serverless functions have ephemeral storage
- Database resets between deployments

**Solution for Production:**
Use a managed database service.

### Recommended: Vercel Postgres

```bash
# Install Vercel Postgres
npm i @vercel/postgres

# In Vercel dashboard, add Postgres
# Automatically sets DATABASE_URL env var
```

### Alternative: External Database

Compatible services:
- **PlanetScale** - MySQL-compatible
- **Supabase** - PostgreSQL with real-time
- **Neon** - Serverless PostgreSQL
- **Railway** - PostgreSQL/MySQL

---

## Monitoring & Debugging

### View Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Deployments**
4. Click on a deployment
5. View **Runtime Logs**

### Function Insights

Vercel provides:
- Execution time
- Memory usage
- Invocation count
- Error rate

Access via **Analytics** tab.

### Enable Vercel Analytics

```bash
npm i @vercel/analytics

# Add to app/layout.jsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## Performance Optimization

### Edge Functions

For ultra-low latency, convert API routes to Edge:

```javascript
// app/api/health/route.js
export const runtime = 'edge';

export async function GET() {
  return Response.json({ status: 'ok' });
}
```

### Caching

Enable caching for static data:

```javascript
export async function GET() {
  return Response.json(data, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate'
    }
  });
}
```

### Image Optimization

Use Next.js Image component (automatic on Vercel):

```jsx
import Image from 'next/image';

<Image src="/icon.png" width={100} height={100} alt="Icon" />
```

---

## Security Best Practices

### Environment Variables

✅ **Never commit secrets**  
✅ **Use Vercel's encrypted storage**  
✅ **Rotate keys regularly**  
✅ **Use different keys for preview/production**  

### HTTPS

✅ **Automatic SSL** - All traffic encrypted  
✅ **Auto-renewal** - Certificates renewed automatically  
✅ **HSTS** - HTTP Strict Transport Security enabled  

### Rate Limiting

Add middleware for rate limiting:

```javascript
// middleware.js
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
});

export async function middleware(request) {
  const ip = request.ip ?? "127.0.0.1";
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new Response("Too Many Requests", { status: 429 });
  }
}
```

---

## Troubleshooting

### Build Fails

**Error**: `Module not found`

```bash
# Solution: Install missing dependencies
npm install
git add package.json package-lock.json
git commit -m "Add missing dependencies"
git push
```

**Error**: `ENOENT: no such file or directory, open './private-key.pem'`

**Cause**: Code is trying to read files during build phase.

**Solution**: Ensure all file system operations are lazy-loaded (deferred until runtime):
- Use getter functions for environment variables that reference files
- Don't execute initialization code at module import time
- The codebase now uses lazy-loading for GitHub private keys

### Environment Variables Not Working

**Error**: `undefined` when accessing env vars

**Solutions:**
1. Verify variables are set in Vercel dashboard
2. Redeploy after adding variables
3. Check `NEXT_PUBLIC_` prefix for client-side variables
4. Clear Vercel cache: **Settings** → **General** → **Clear Cache**

### API Routes Timeout

**Error**: Function execution timeout

**Solutions:**
1. Optimize long-running operations
2. Increase timeout limit (Vercel Pro)
3. Move to background jobs (Vercel Cron or external service)

### Database Connection Issues

**Error**: Cannot connect to database

**Solutions:**
1. Check `DATABASE_URL` is set correctly
2. Verify database service is accessible from Vercel IPs
3. Check connection pooling settings
4. Enable SSL if required by database

---

## Cost Optimization

### Free Tier Limits

- **Bandwidth**: 100GB/month
- **Serverless Function Executions**: Unlimited
- **Build Time**: 6000 minutes/month
- **Deployments**: Unlimited

### Tips to Stay Within Free Tier

1. ✅ Enable caching for static content
2. ✅ Optimize images with Next.js Image
3. ✅ Use ISR (Incremental Static Regeneration) where possible
4. ✅ Implement client-side caching

### When to Upgrade to Pro ($20/month)

- Need > 100GB bandwidth
- Want password-protected previews
- Need advanced analytics
- Require team collaboration features

---

## CI/CD Integration

### GitHub Actions

Vercel automatically deploys, but you can add additional checks:

```yaml
# .github/workflows/test.yml
name: Test
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run build
```

### Deploy Hooks

Trigger deployments programmatically:

```bash
curl -X POST https://api.vercel.com/v1/integrations/deploy/xxx/xxx
```

---

## Best Practices

### 1. Environment-Specific Variables

Set different values for Preview vs Production:

- Go to **Settings** → **Environment Variables**
- Set values separately for:
  - Production
  - Preview
  - Development

### 2. Preview Deployment Testing

Always test preview deployments before merging:

1. Create PR
2. Wait for Vercel preview deployment
3. Click preview URL in PR comments
4. Test all functionality
5. Merge only if preview works

### 3. Use Deployment Protection

Enable protection for production:

- Go to **Settings** → **Deployment Protection**
- Enable **Password Protection** for previews
- Enable **Vercel Authentication** for production

### 4. Monitor Performance

Regularly check:
- Function execution times
- Error rates
- Bandwidth usage
- Build times

---

## Migration Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel project created
- [ ] All environment variables set
- [ ] First deployment successful
- [ ] GitHub App webhooks updated
- [ ] OAuth callback URL updated
- [ ] Custom domain configured (optional)
- [ ] Database configured (if using external)
- [ ] SSL certificate active (automatic)
- [ ] Preview deployments working
- [ ] Production deployment tested

---

## Getting Help

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: Available in dashboard
- **Community**: [Vercel Discord](https://discord.gg/vercel)

---

## Summary

Vercel provides the best deployment experience for Next.js applications:

✅ **Zero Config** - Just connect and deploy  
✅ **Automatic HTTPS** - Secure by default  
✅ **Global CDN** - Fast worldwide  
✅ **Preview Deployments** - Test before production  
✅ **Free Tier** - Perfect for getting started  

**Ready to deploy?** Connect your repository and go live in minutes! 🚀

