# GitHub App Setup

This guide walks you through creating and configuring your GitHub App for BountyPay.

---

## Step 1: Create GitHub App

1. Go to [GitHub Apps settings](https://github.com/settings/apps/new)

2. Fill in basic information:
   ```
   GitHub App name: BountyPay
   Homepage URL: https://your-domain.com
   Webhook URL: https://your-domain.com/webhooks/github
   ```

3. Generate webhook secret:
   ```bash
   openssl rand -hex 32
   ```
   Save this for later.

---

## Step 2: Set Permissions

### Repository Permissions
- **Issues**: Read and write
- **Pull requests**: Read and write
- **Metadata**: Read-only (auto-selected)

### Subscribe to Events
- ✅ Issues
- ✅ Pull request

---

## Step 3: Generate Credentials

After creating the app:

1. **App ID** - Note the number at the top of the page

2. **Private Key**
   - Click "Generate a private key"
   - Download the `.pem` file
   - Save it to your project root

3. **Client ID & Secret**
   - Scroll to "OAuth credentials"
   - Note the Client ID
   - Click "Generate a new client secret"
   - Copy the secret immediately

---

## Step 4: Configure Environment

Add credentials to `.env`:

```bash
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=Iv1.your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

---

## Step 5: Install App

1. Go to your GitHub App settings
2. Click "Install App" in sidebar
3. Choose a repository
4. Click "Install"

---

## Webhook URL Requirements

⚠️ **Important**: GitHub webhooks require a public URL.

- ❌ `localhost` won't work
- ✅ Use `ngrok` for local development
- ✅ Use Railway/Render for production

See [Local Development](./local-development.md) for ngrok setup.

---

## Verification

Test your setup:

1. Start your server
2. Open an issue in the connected repo
3. Bot should comment within 5 seconds

Check webhook deliveries:
- GitHub App settings → Advanced tab
- View recent deliveries and responses

---

## Troubleshooting

### Webhook signature verification fails
- Check `GITHUB_WEBHOOK_SECRET` matches
- Restart server after changing `.env`

### Bot doesn't comment
- Verify app is installed on repository
- Check webhook URL is correct
- View webhook deliveries for errors

### "Webhook URL not reachable"
- Use ngrok or deploy to cloud
- Ensure URL is publicly accessible

