import { config } from 'dotenv';
import { readFileSync } from 'fs';

config();

export const CONFIG = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // GitHub
  github: {
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY_PATH 
      ? readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8')
      : process.env.GITHUB_PRIVATE_KEY,
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
    resolverPrivateKey: process.env.RESOLVER_PRIVATE_KEY,
  },

  // Database
  databasePath: process.env.DATABASE_PATH,
};

// Validate required config
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
    console.error(`❌ Missing required config: ${key}`);
    process.exit(1);
  }
}

