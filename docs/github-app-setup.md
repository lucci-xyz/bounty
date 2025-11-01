# GitHub App Setup Guide

Complete guide for setting up the BountyPay GitHub App for development or production.

---

## Overview

The BountyPay GitHub App integrates with GitHub to:
- Receive webhook events for issues and pull requests
- Post comments and labels on issues/PRs
- Handle OAuth authentication for wallet linking
- Automatically process bounty payouts

---

## Prerequisites

- GitHub account with organization or repository admin access
- A publicly accessible server URL for webhooks (or ngrok for local development)
- SSL/HTTPS endpoint (required by GitHub for webhooks)

---

## Method 1: Using GitHub App Manifest (Recommended for Quick Setup)

This method is fastest for development and testing.

### Step 1: Create App from Manifest

1. Navigate to your GitHub organization or user account settings
2. Go to **Developer settings** → **GitHub Apps** → **New GitHub App**
3. Click **Create from a manifest** (or visit: `https://github.com/organizations/{org}/settings/apps/new?state=manifest`)
4. Copy the contents of `github-app-manifest.json` from the repository root
5. Paste into the manifest form and click **Create GitHub App**
6. GitHub will create the app and redirect you to the app settings page

### Step 2: Configure App Settings

After creation, update the following:

**General Settings:**
- **Webhook URL**: Set to `https://your-domain.com/webhooks/github`
- **Webhook secret**: Generate a secure random string and save it
- **Callback URL**: Set to `https://your-domain.com/oauth/callback`

**Permissions:**
The manifest already sets these, but verify:
- **Issues**: Read and write (to post comments and labels)
- **Pull requests**: Read and write (to check PR status)
- **Metadata**: Read-only (required by GitHub)

**Subscribe to events:**
- ✅ **Issues** (required for bounty attachment)
- ✅ **Pull request** (required for automatic payouts)

### Step 3: Save Configuration Values

From the app settings page, save:
- **App ID**: Found in the "About" section
- **Client ID**: Found under "OAuth credentials"
- **Generate a private key**: Click "Generate a private key" and download the `.pem` file

You'll need these values for your environment variables.

---

## Method 2: Manual Setup (For Production)

For production deployments, you may want more control over the setup process.

### Step 1: Create New GitHub App

1. Go to your organization or account → **Settings** → **Developer settings** → **GitHub Apps**
2. Click **New GitHub App**

### Step 2: Configure Basic Information

**GitHub App name**: `BountyPay` (or `BountyPay-STAGE` for staging)

**Homepage URL**: Your application URL

**User authorization callback URL**: 
```
https://your-domain.com/oauth/callback
```

**Webhook:**
- ✅ **Active**: Check this
- **Webhook URL**: `https://your-domain.com/webhooks/github`
- **Webhook secret**: Generate using:
  ```bash
  openssl rand -hex 32
  ```

**Where can this GitHub App be installed?**
- Choose based on your needs:
  - **Only on this account**: Single organization/user
  - **Any account**: Public app (requires approval)

### Step 3: Configure Permissions & Events

**Repository permissions:**

| Permission | Access Level | Why It's Needed |
|------------|--------------|-----------------|
| Issues | Read and write | Post comments, add labels |
| Pull requests | Read and write | Check PR status, verify merges |
| Metadata | Read-only | Required by GitHub |

**Subscribe to events:**
- ✅ **Issues**
- ✅ **Pull request**

**Optional but recommended:**
- ✅ **Installation** (for tracking app installations)

### Step 4: Save App Credentials

After clicking **Create GitHub App**, save:

1. **App ID**: Displayed in the "About" section
2. **Client ID**: Under "OAuth credentials"
3. **Client Secret**: Generate under "OAuth credentials"
4. **Private Key**: Click "Generate a private key" and download the `.pem` file

---

## Environment Variables

Add these to your `.env` file:

```bash
# GitHub App Configuration
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem
# OR inline (escape newlines with \n):
# GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### Private Key Format

You can provide the private key in two ways:

**Option 1: File path** (Recommended)
```bash
GITHUB_PRIVATE_KEY_PATH=/path/to/private-key.pem
```

**Option 2: Inline** (for containerized deployments)
```bash
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
```

---

## Install the App

### For Organizations

1. Go to **Organization Settings** → **GitHub Apps**
2. Find your app and click **Configure**
3. Choose which repositories to grant access:
   - **Only select repositories**: Choose specific repos
   - **All repositories**: Grant access to all (easier for testing)

### For Personal Accounts

1. Go to **Settings** → **Applications** → **Installed GitHub Apps**
2. Find your app and click **Configure**
3. Select repositories to grant access

After installation, note the **Installation ID** (you may need this for multi-installation setups).

---

## Webhook Configuration

### Webhook URL Format

```
https://your-domain.com/webhooks/github
```

**Important:**
- Must use HTTPS
- Must be publicly accessible
- GitHub will send events to this endpoint

### Webhook Secret

Generate a secure random string:
```bash
openssl rand -hex 32
```

Save this as `GITHUB_WEBHOOK_SECRET` in your environment.

### Testing Webhook Delivery

1. In your GitHub App settings, go to **Advanced** → **Webhook deliveries**
2. Click **Redeliver** on recent deliveries to test
3. Check your server logs for received webhooks

---

## OAuth Configuration

### Callback URL

Set in your GitHub App settings:
```
https://your-domain.com/oauth/callback
```

### OAuth Flow

The app uses OAuth to authenticate users for wallet linking:

1. User visits `/link-wallet`
2. User clicks "Connect GitHub"
3. Redirects to GitHub OAuth
4. User authorizes the app
5. GitHub redirects back to `/oauth/callback`
6. Server exchanges code for token
7. User is authenticated and can link wallet

### Required Scopes

The app requests `read:user` scope, which is automatically included when you configure the callback URL.

---

## Local Development Setup

For local development, you'll need to expose your local server to GitHub:

### Using ngrok

1. Install ngrok: https://ngrok.com/download
2. Start your local server: `npm run dev`
3. In another terminal, expose it:
   ```bash
   ngrok http 3000
   ```
4. Use the ngrok HTTPS URL in your GitHub App webhook settings:
   ```
   https://your-subdomain.ngrok.io/webhooks/github
   ```
5. Update OAuth callback URL:
   ```
   https://your-subdomain.ngrok.io/oauth/callback
   ```

### Using ngrok.yml (for persistent URLs)

Create `ngrok.yml` in project root:
```yaml
version: "2"
authtoken: your_ngrok_token
tunnels:
  bountypay:
    proto: http
    addr: 3000
```

Then run:
```bash
ngrok start --all
```

**Note:** Free ngrok URLs change on restart. Consider a paid plan for stable URLs.

---

## Verification

### Test Webhook Connection

1. Create a test issue in a repository where the app is installed
2. Check server logs for webhook delivery:
   ```
   📬 Webhook received: issues (delivery-id)
   ```
3. Verify a comment is posted on the issue

### Test OAuth Flow

1. Visit `/link-wallet` on your server
2. Click "Connect GitHub"
3. Authorize the app
4. Verify redirect back to your app
5. Check that GitHub user info is stored in session

### Common Issues

**Webhook not received:**
- Verify webhook URL is publicly accessible
- Check SSL certificate is valid
- Verify webhook secret matches in app settings
- Check server logs for signature verification errors

**OAuth callback fails:**
- Verify callback URL exactly matches GitHub App settings
- Check OAuth client ID and secret are correct
- Ensure session cookies are working (check SameSite settings)

**Permissions denied:**
- Verify app has "Issues: write" permission
- Check app is installed on the repository
- Verify installation has access to the repository

---

## Production Checklist

Before deploying to production:

- [ ] App is installed on target repositories
- [ ] Webhook URL uses production domain
- [ ] Webhook secret is strong and secure
- [ ] Private key is stored securely (not in git)
- [ ] OAuth callback URL matches production domain
- [ ] SSL certificate is valid and auto-renewing
- [ ] App permissions are minimal (only what's needed)
- [ ] Webhook deliveries are monitored
- [ ] Error logging is configured

---

## Troubleshooting

See [Troubleshooting Guide](troubleshooting.md) for detailed solutions to common issues.

---

## Next Steps

- [Local Development Setup](local-development.md) - Set up your local environment
- [Deployment Guide](deployment.md) - Deploy to production
- [Architecture Overview](architecture.md) - Understand the system design

