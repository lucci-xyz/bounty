import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { REGISTRY } from '../config/chain-registry.js';

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

// Build tokens map from REGISTRY for stats API
function buildTokensMap() {
  const tokens = {};
  for (const alias in REGISTRY) {
    const { token } = REGISTRY[alias];
    const addressKey = token.address.toLowerCase();
    tokens[addressKey] = {
      symbol: token.symbol,
      name: token.symbol, // Use symbol as name for simplicity
      decimals: token.decimals
    };
  }
  return tokens;
}

export const CONFIG = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  envTarget: process.env.ENV_TARGET,
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
    resolverPrivateKey: process.env.RESOLVER_PRIVATE_KEY,
  },

  // Token metadata for display (built from REGISTRY)
  get tokens() {
    return buildTokensMap();
  },

  // Database
  databasePath: process.env.DATABASE_PATH,
};

// Validation function (called at runtime, not at build time)
export function validateConfig() {
  const errors = [];

  // Required server config
  const requiredServer = [
    { key: 'sessionSecret', env: 'SESSION_SECRET' },
    { key: 'frontendUrl', env: 'FRONTEND_URL' },
    { key: 'envTarget', env: 'ENV_TARGET' },
  ];

  for (const { key, env } of requiredServer) {
    if (!CONFIG[key]) {
      errors.push(`Missing required config: ${env}`);
    }
  }

  // Validate ENV_TARGET
  if (CONFIG.envTarget && !['stage', 'prod'].includes(CONFIG.envTarget)) {
    errors.push(`Invalid ENV_TARGET: ${CONFIG.envTarget} (must be "stage" or "prod")`);
  }

  // Required GitHub config
  const requiredGitHub = [
    { key: 'github.appId', env: 'GITHUB_APP_ID' },
    { key: 'github.privateKey', env: 'GITHUB_PRIVATE_KEY' },
    { key: 'github.webhookSecret', env: 'GITHUB_WEBHOOK_SECRET' },
    { key: 'github.clientId', env: 'GITHUB_CLIENT_ID' },
    { key: 'github.clientSecret', env: 'GITHUB_CLIENT_SECRET' },
  ];

  for (const { key, env } of requiredGitHub) {
    const keys = key.split('.');
    let value = CONFIG;
    for (const k of keys) {
      value = value?.[k];
    }
    if (!value) {
      errors.push(`Missing required config: ${env}`);
    }
  }

  // Required blockchain config
  if (!CONFIG.blockchain.resolverPrivateKey) {
    errors.push('Missing required config: RESOLVER_PRIVATE_KEY');
  }

  // Validate resolver private key format (should start with 0x and be 64 hex chars)
  if (CONFIG.blockchain.resolverPrivateKey) {
    const key = CONFIG.blockchain.resolverPrivateKey;
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(key)) {
      errors.push('Invalid RESOLVER_PRIVATE_KEY format (must be 64 hex characters, optionally prefixed with 0x)');
    }
  }

  // Validate callback targets conditionally
  if (CONFIG.envTarget === 'stage' && !CONFIG.stageCallbackUrl) {
    errors.push('Missing required config: STAGE_CALLBACK_URL (required when ENV_TARGET=stage)');
  }
  if (CONFIG.envTarget === 'prod' && !CONFIG.prodCallbackUrl) {
    errors.push('Missing required config: PROD_CALLBACK_URL (required when ENV_TARGET=prod)');
  }

  // Validate REGISTRY was built successfully (chain-registry.js throws on build errors)
  if (Object.keys(REGISTRY).length === 0) {
    errors.push('No blockchain networks configured. Check BLOCKCHAIN_SUPPORTED_*_ALIASES environment variables.');
  }

  // Validate default aliases are set
  const mainnetAliases = Object.keys(REGISTRY).filter(k => REGISTRY[k].group === 'mainnet');
  const testnetAliases = Object.keys(REGISTRY).filter(k => REGISTRY[k].group === 'testnet');

  if (mainnetAliases.length > 0 && !process.env.BLOCKCHAIN_DEFAULT_MAINNET_ALIAS) {
    errors.push('Missing required config: BLOCKCHAIN_DEFAULT_MAINNET_ALIAS (mainnet networks are configured)');
  }

  if (testnetAliases.length > 0 && !process.env.BLOCKCHAIN_DEFAULT_TESTNET_ALIAS) {
    errors.push('Missing required config: BLOCKCHAIN_DEFAULT_TESTNET_ALIAS (testnet networks are configured)');
  }

  // Report all errors at once
  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }

  return true;
}
