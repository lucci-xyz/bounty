import { config } from 'dotenv';
import { readFileSync } from 'fs';

// Load .env file (only in development)
if (process.env.NODE_ENV !== 'production') {
  config();
}

// Lazy-load private key to avoid build-time file access
function getPrivateKey() {
  if (process.env.GITHUB_PRIVATE_KEY_PATH) {
    try {
      return readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8');
    } catch (error) {
      // If file doesn't exist, fall back to env var
      return process.env.GITHUB_PRIVATE_KEY;
    }
  }
  return process.env.GITHUB_PRIVATE_KEY;
}

export const CONFIG = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  envTarget: process.env.ENV_TARGET || 'stage',
  stageCallbackUrl: process.env.STAGE_CALLBACK_URL,
  prodCallbackUrl: process.env.PROD_CALLBACK_URL,

  // GitHub - lazy load private key
  github: {
    appId: process.env.GITHUB_APP_ID,
    get privateKey() {
      return getPrivateKey();
    },
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },

  // Blockchain
  blockchain: {
    chainId: parseInt(process.env.CHAIN_ID || '84532'),
    rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
    escrowContract: process.env.ESCROW_CONTRACT,
    usdcContract: process.env.USDC_CONTRACT || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    musdContract: process.env.MUSD_CONTRACT,
    resolverPrivateKey: process.env.RESOLVER_PRIVATE_KEY,
  },

  // Token metadata for display
  tokens: {
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    },
    ...(process.env.MUSD_CONTRACT ? {
      [process.env.MUSD_CONTRACT]: {
        symbol: 'MUSD',
        name: 'Mezo USD',
        decimals: 18
      }
    } : {})
  },

  // Database
  databasePath: process.env.DATABASE_PATH,
};

// Validation function (called at runtime, not at build time)
export function validateConfig() {
  const required = [
    'sessionSecret',
    'github.appId',
    'github.privateKey',
    'github.webhookSecret',
    'github.clientId',
    'github.clientSecret',
    'blockchain.escrowContract',
    'blockchain.resolverPrivateKey',
  ];

  for (const key of required) {
    const keys = key.split('.');
    let value = CONFIG;
    for (const k of keys) {
      value = value?.[k];
    }
    if (!value) {
      console.error(`Missing required config: ${key}`);
      return false;
    }
  }

  // Validate callback targets conditionally
  if (CONFIG.envTarget === 'stage' && !CONFIG.stageCallbackUrl) {
    console.error('Missing required config: stageCallbackUrl (STAGE_CALLBACK_URL)');
    return false;
  }
  if (CONFIG.envTarget === 'prod' && !CONFIG.prodCallbackUrl) {
    console.error('Missing required config: prodCallbackUrl (PROD_CALLBACK_URL)');
    return false;
  }

  return true;
}

