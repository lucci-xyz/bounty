# Deployment

Deploy BountyPay to production with a permanent public URL.

---

## Recommended: Railway

Railway provides the easiest deployment with:
- Free tier available
- Automatic HTTPS
- GitHub integration
- Zero-config deployment

---

## Deploy to Railway

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/bountypay.git
git push -u origin main
```

### 2. Create Railway Project

1. Visit https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Click "Deploy"

### 3. Add Environment Variables

In Railway dashboard → Variables:

```bash
NODE_ENV=production
SESSION_SECRET=your_session_secret
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=paste_full_pem_content_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
RESOLVER_PRIVATE_KEY=your_resolver_private_key

# Pre-configured (no changes needed)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
DATABASE_PATH=./server/db/bounty.db
```

**Note**: For `GITHUB_PRIVATE_KEY`, paste the entire `.pem` file content including `-----BEGIN` and `-----END` lines.

### 4. Generate Domain

1. Go to Settings → Domains
2. Click "Generate Domain"
3. Copy your URL (e.g., `https://bountypay.up.railway.app`)

### 5. Update GitHub App

Update your GitHub App settings with Railway URL:
- Homepage URL: `https://your-app.railway.app`
- Webhook URL: `https://your-app.railway.app/webhooks/github`
- Callback URL: `https://your-app.railway.app/oauth/callback`

---

## Alternative: Render

### 1. Create Account

Visit https://render.com and sign up

### 2. New Web Service

1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configure:
   ```
   Name: bountypay
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

### 3. Add Environment Variables

Add all variables from Railway section above

### 4. Deploy

Click "Create Web Service" and wait for deployment

---

## Alternative: VPS (Advanced)

For DigitalOcean, AWS, or other VPS:

### 1. Setup Server

```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

### 2. Deploy Code

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/bountypay.git
cd bountypay

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your values
```

### 3. Run with PM2

```bash
# Start application
pm2 start server/index.js --name bountypay

# Save PM2 config
pm2 save
pm2 startup

# View logs
pm2 logs bountypay
```

### 4. Setup Nginx

```bash
# Install Nginx
apt-get install -y nginx

# Configure reverse proxy
nano /etc/nginx/sites-available/bountypay
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/bountypay /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 5. Setup SSL

```bash
# Install Certbot
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com
```

---

## Post-Deployment

### Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/health

# Expected response:
{"status":"ok","service":"bountypay-github-app","version":"1.0.0"}
```

### Test Integration

1. Open an issue in connected repo
2. Bot should comment within 5 seconds
3. Click "Attach Bounty" link
4. Should load your production site

### Monitor Logs

**Railway:**
```bash
railway logs
```

**Render:**
View in dashboard → Logs

**PM2:**
```bash
pm2 logs bountypay
```

---

## Database Backup

For production, consider:

### Option 1: Railway Volumes

```bash
# Create volume
railway volume create bounty-db

# Attach to service
railway volume attach bounty-db /app/server/db
```

### Option 2: PostgreSQL

For better persistence, migrate to PostgreSQL:
1. Add PostgreSQL plugin in Railway
2. Update database connection in code
3. Migrate schema

---

## Scaling Considerations

### For High Traffic

- Switch from SQLite to PostgreSQL
- Add Redis for session storage
- Implement queue system for blockchain calls
- Use CDN for frontend assets

### Monitoring

- Set up error tracking (Sentry, LogRocket)
- Monitor resolver wallet balance
- Track webhook delivery rates
- Set up uptime monitoring

---

## Security Best Practices

- ✅ Use environment variables for secrets
- ✅ Keep resolver wallet balance minimal
- ✅ Enable HTTPS only
- ✅ Regularly backup database
- ✅ Monitor for suspicious activity
- ✅ Rotate secrets periodically

---

## Cost Estimates

**Railway Free Tier:**
- $5 credit/month
- ~500 hours uptime
- Good for testing

**Railway Pro:**
- $20/month minimum
- Unlimited uptime
- Better for production

**Render:**
- $7/month minimum
- Always-on service

**VPS:**
- $5-10/month (DigitalOcean, Linode)
- Full control
- More setup required

---

## Support

- **Issues**: Check logs first
- **Database**: Backup before major changes
- **Blockchain**: Monitor BaseScan for transactions
- **Updates**: `git pull` and redeploy

