# Deployment Guide

Complete guide for deploying BountyPay to Vercel.

---

## Overview

BountyPay is a Next.js application optimized for deployment on Vercel. This guide covers the complete deployment process from setup to production.

---

## Prerequisites

- GitHub repository with the codebase
- GitHub App configured (see [GitHub App Setup](../development/github-app-setup.md))
- All environment variables ready
- Vercel account (free tier works great)

---

## Deploying to Vercel

### Step 1: Connect Repository

1. Sign up at [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Vercel will automatically detect Next.js and configure build settings

### Step 2: Configure Environment Variables

In the Vercel dashboard, go to **Settings** → **Environment Variables** and add:

**Required Variables:**

```bash
# Session
SESSION_SECRET=your-random-secret-string-here

# GitHub App
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key_content
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Blockchain - Base Sepolia (default)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Resolver Wallet
RESOLVER_PRIVATE_KEY=your_resolver_private_key

# Frontend URL (set after first deployment)
FRONTEND_URL=https://your-app.vercel.app
```

**Optional Variables:**

```bash
# Mezo Testnet Support (for MUSD)
NEXT_PUBLIC_MEZO_RPC_URL=https://mezo-testnet.drpc.org

# Custom RPC endpoints
RPC_URL=your-custom-rpc-url

# Database (if using custom path)
DATABASE_PATH=/tmp/bounty.db
```

**Important Notes:**

- For `GITHUB_PRIVATE_KEY`, paste the full PEM file content (Vercel handles multi-line values)
- `SESSION_SECRET` should be a random string (at least 32 characters)
- `FRONTEND_URL` should match your deployment URL (update after first deploy)
- Environment variables with `NEXT_PUBLIC_` prefix are available in the browser

### Step 3: Configure GitHub App Webhooks

After your first deployment, update your GitHub App settings:

1. Get your Vercel deployment URL: `https://your-app.vercel.app`
2. Go to your GitHub App settings
3. Update these URLs:
   - **Webhook URL**: `https://your-app.vercel.app/api/webhooks/github`
   - **OAuth Callback URL**: `https://your-app.vercel.app/api/oauth/callback`
4. Update `FRONTEND_URL` environment variable in Vercel to match

### Step 4: Deploy

Click **"Deploy"** in Vercel. The deployment process will:

1. Install dependencies (`npm install`)
2. Build the Next.js app (`npm run build`)
3. Deploy to serverless functions
4. Provide you with a live URL

**Build Configuration (Automatic):**
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`
- Node Version: 18.x or higher

### Step 5: Database Initialization

**Important:** On first deployment, you need to initialize the database:

1. Go to your Vercel deployment
2. Navigate to **Settings** → **Functions**
3. You can either:
   - Use Vercel's serverless PostgreSQL (recommended for production)
   - Use SQLite with persistent storage (requires Vercel Pro for persistent /tmp)
   - Use an external database service (like PlanetScale, Supabase, or Neon)

**For SQLite (Simple Setup):**
The app will auto-create the SQLite database on first run, but note that Vercel's serverless environment may lose the database between deployments. For production, consider using a managed database.

**For Production Database:**
Consider using Vercel Postgres or another managed database:

```bash
# Vercel Postgres
npm i @vercel/postgres

# Update server/db/index.js to use PostgreSQL instead of SQLite
```

### Step 6: Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's instructions to update DNS records
4. Update `FRONTEND_URL` and GitHub App URLs to use your custom domain

---

## Vercel-Specific Features

### Automatic Deployments

- **Main Branch**: Automatically deploys to production
- **Pull Requests**: Creates preview deployments
- **Branch Deploys**: Each branch gets its own URL

### Environment Variables by Environment

You can set different values for:
- **Production**: Live production site
- **Preview**: Pull request previews
- **Development**: Local development

### Edge Functions

Vercel runs API routes as serverless functions by default. For even better performance, you can opt into Edge Functions for specific routes.

### Monitoring

Vercel provides built-in:
- Real-time logs
- Function metrics
- Performance analytics
- Error tracking

---

## Post-Deployment Checklist

- [ ] Application loads at your Vercel URL
- [ ] GitHub OAuth login works
- [ ] Wallet connection works
- [ ] Bounty creation saves to database
- [ ] GitHub webhooks are processed
- [ ] API routes respond correctly (test `/api/health`)
- [ ] Environment variables are all set correctly
- [ ] Custom domain configured (if using)
- [ ] SSL certificate active (automatic with Vercel)

---

## Troubleshooting

### Build Fails

**Issue**: Build fails with module errors
**Solution**: 
```bash
# Locally test the build
npm run build

# Check for missing dependencies
npm install
```

### Environment Variables Not Working

**Issue**: App can't access environment variables
**Solution**:
- Ensure variables are set in Vercel dashboard
- Redeploy after adding variables
- Check that client-side variables use `NEXT_PUBLIC_` prefix

### Database Errors

**Issue**: SQLite database not persisting
**Solution**: Vercel's serverless functions have ephemeral storage. Consider:
- Using Vercel Postgres
- Connecting to external database (PlanetScale, Supabase)
- For development only, accept that SQLite will reset

### Webhook Signature Verification Fails

**Issue**: GitHub webhooks return 401
**Solution**:
- Verify `GITHUB_WEBHOOK_SECRET` is set correctly
- Check that webhook URL in GitHub App settings is correct
- Ensure the secret matches between GitHub and Vercel

### Session Issues

**Issue**: Users get logged out frequently
**Solution**:
- Check `SESSION_SECRET` is set
- Ensure cookies are not blocked
- Verify `FRONTEND_URL` matches your actual domain

---

## Performance Optimization

### Enable Edge Caching

Add to `next.config.js`:

```javascript
export const runtime = 'edge';
```

For static assets and API routes that can be cached.

### Database Connection Pooling

If using external database:

```javascript
// Use connection pooling for better performance
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});
```

### Static Generation

Pages that don't need real-time data are automatically statically generated:
- Home page (`/`)
- Info pages

Dynamic pages are server-rendered:
- Bounty pages (with URL params)
- OAuth callbacks

---

## Security Considerations

### Environment Variables

- ✅ Never commit secrets to repository
- ✅ Use Vercel's encrypted environment variables
- ✅ Rotate `SESSION_SECRET` periodically
- ✅ Keep `GITHUB_PRIVATE_KEY` and `RESOLVER_PRIVATE_KEY` secure

### HTTPS

- ✅ Vercel provides SSL automatically
- ✅ All traffic is encrypted
- ✅ Automatic certificate renewal

### Rate Limiting

Consider adding rate limiting for API routes:

```javascript
// middleware.js
import { Ratelimit } from "@upstash/ratelimit";

export async function middleware(request) {
  // Implement rate limiting
}
```

---

## Scaling

Vercel automatically scales your application:

- **Serverless Functions**: Scale to zero when not used
- **Global CDN**: Content delivered from nearest edge location
- **Automatic Scaling**: Handles traffic spikes automatically

**No configuration needed** - Vercel handles it all!

---

## Monitoring & Debugging

### View Logs

1. Go to Vercel dashboard
2. Select your deployment
3. Click **"Logs"** to view real-time logs

### Check Function Performance

1. Go to **Analytics** in Vercel dashboard
2. View function execution times
3. Monitor error rates

### Error Tracking

Consider integrating error tracking:

- **Sentry**: Error tracking and performance monitoring
- **LogRocket**: Session replay and debugging
- **Vercel Analytics**: Built-in web analytics

---

## Production Best Practices

1. **Use Production Build Locally**: Test with `npm run build && npm start`
2. **Monitor Performance**: Use Vercel Analytics to track performance
3. **Set Up Alerts**: Configure Slack/email notifications for errors
4. **Regular Backups**: If using database, set up regular backups
5. **Test Webhooks**: Use GitHub's webhook test feature to verify
6. **Document Changes**: Keep deployment notes for major updates

---

## Cost Considerations

**Vercel Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth per month
- Serverless function executions
- Automatic SSL
- Preview deployments

**Vercel Pro ($20/month) Adds:**
- More bandwidth
- Faster builds
- Team features
- Advanced analytics
- Password protection for previews

For BountyPay's typical usage, the **Free tier is usually sufficient** for development and small-scale production use.

---

## Getting Help

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Support**: Available through dashboard
- **Community**: Next.js Discord and Vercel Community

---

## Maintenance

### Updating Dependencies

```bash
npm update
npm run build
git commit -am "Update dependencies"
git push  # Triggers automatic deployment
```

### Database Migrations

When schema changes:

```bash
# Update server/db/schema.js
# Vercel will run migrations on next deployment
```

### Monitoring Updates

- Check Vercel dashboard weekly
- Review function performance
- Monitor error rates
- Update Next.js monthly for security patches

---

## Next Steps

After successful deployment:

1. Test all functionality in production
2. Set up monitoring and alerts
3. Configure custom domain
4. Enable analytics
5. Share with users!

**Your BountyPay app is now live on Vercel! 🎉**
