import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import { initDB } from './db/index.js';
import { initGitHubApp, getGitHubApp } from './github/client.js';
import { initBlockchain } from './blockchain/contract.js';
import { handleWebhook } from './github/webhooks.js';
import { CONFIG } from './config.js';
import apiRoutes from './routes/api.js';
import oauthRoutes from './routes/oauth.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// ========== Middleware ==========

// Trust upstream proxy (Railway/Render/NGINX) so secure cookies and protocol detection work
if (CONFIG.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: false // Disable for frontend
}));

app.use(cors({
  origin: CONFIG.frontendUrl,
  credentials: true
}));

// Parse JSON for all routes EXCEPT webhooks (which needs raw body)
app.use((req, res, next) => {
  if (req.path === '/webhooks/github' || req.path === '/github/callback') {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: CONFIG.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: CONFIG.nodeEnv === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// ========== Initialize Services ==========

console.log('🚀 Starting BountyPay GitHub App...\n');

// Initialize database (auto-creates tables if they don't exist)
try {
  initDB();
  console.log('✅ Database ready\n');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

// Initialize GitHub App
initGitHubApp();

// Initialize blockchain connection
initBlockchain();

// ========== Routes ==========

// OAuth routes (register BEFORE static to ensure callback is handled by server)
app.use('/oauth', oauthRoutes);

// API routes
app.use('/api', apiRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// ========= Callback Proxy (Stage/Prod) =========
// Proxies GitHub callbacks to the appropriate target based on ENV_TARGET
// Uses raw body to preserve signatures if required by downstream handlers
app.post('/github/callback', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const target = CONFIG.envTarget === 'stage' ? CONFIG.stageCallbackUrl : CONFIG.prodCallbackUrl;
    if (!target) {
      return res.status(500).send('Callback target not configured');
    }

    // Forward headers, but avoid overriding Host; let fetch set it for the target
    const headers = { ...req.headers };
    delete headers.host;

    const upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: req.body, // raw Buffer
    });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (error) {
    console.error('Callback proxy error:', error);
    res.status(502).send('Upstream callback proxy failed');
  }
});

// GitHub webhook endpoint - needs raw body for signature verification
app.post('/webhooks/github', express.json({ verify: (req, res, buf) => {
  req.rawBody = buf.toString('utf8');
}}), async (req, res) => {
  try {
    const githubApp = getGitHubApp();
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const id = req.headers['x-github-delivery'];

    // Verify webhook signature using raw body
    await githubApp.webhooks.verify(req.rawBody, signature);

    console.log(`\n📬 Webhook received: ${event} (${id})`);

    // Handle the webhook (parsed body)
    await handleWebhook(event, req.body);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    
    if (error.message && error.message.includes('signature')) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'bountypay-github-app',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Frontend routes (SPA fallback)
app.get('/attach-bounty', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/attach-bounty.html'));
});

app.get('/link-wallet', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/link-wallet.html'));
});

app.get('/refund', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/refund.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========== Start Server ==========

const PORT = CONFIG.port;

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`   Frontend: ${CONFIG.frontendUrl}`);
  console.log(`   Webhooks: ${CONFIG.frontendUrl}/webhooks/github`);
  console.log(`\n💡 For local development, expose with ngrok:`);
  console.log(`   ngrok http ${PORT}`);
  console.log(`\n🎯 Ready to process bounties!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

