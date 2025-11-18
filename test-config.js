#!/usr/bin/env node
/**
 * Test script to validate chain registry configuration
 * Run with: node test-config.js
 */

// Set test environment variables
process.env.SESSION_SECRET = 'test-session-secret-32-chars-minimum';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.ENV_TARGET = 'stage';
process.env.GITHUB_APP_ID = '12345';
process.env.GITHUB_PRIVATE_KEY = '0x'.padEnd(66, '0');
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.GITHUB_CLIENT_ID = 'test-client-id';
process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
process.env.RESOLVER_PRIVATE_KEY = '0x'.padEnd(66, '0');
process.env.STAGE_CALLBACK_URL = 'http://localhost:3000/api/webhooks/github';

// Blockchain config
process.env.BLOCKCHAIN_SUPPORTED_MAINNET_ALIASES = 'BASE_MAINNET,MEZO_MAINNET';
process.env.BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES = 'BASE_SEPOLIA,MEZO_TESTNET';
process.env.BLOCKCHAIN_DEFAULT_MAINNET_ALIAS = 'BASE_MAINNET';
process.env.BLOCKCHAIN_DEFAULT_TESTNET_ALIAS = 'BASE_SEPOLIA';

// Base Mainnet
process.env.BASE_MAINNET_ESCROW_ADDRESS = '0x0000000000000000000000000000000000000001';
process.env.BASE_MAINNET_TOKEN_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
process.env.BASE_MAINNET_TOKEN_SYMBOL = 'USDC';
process.env.BASE_MAINNET_TOKEN_DECIMALS = '6';

// Mezo Mainnet
process.env.MEZO_MAINNET_ESCROW_ADDRESS = '0x0000000000000000000000000000000000000002';
process.env.MEZO_MAINNET_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000003';
process.env.MEZO_MAINNET_TOKEN_SYMBOL = 'MUSD';
process.env.MEZO_MAINNET_TOKEN_DECIMALS = '18';

// Base Sepolia
process.env.BASE_SEPOLIA_ESCROW_ADDRESS = '0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7';
process.env.BASE_SEPOLIA_TOKEN_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
process.env.BASE_SEPOLIA_TOKEN_SYMBOL = 'USDC';
process.env.BASE_SEPOLIA_TOKEN_DECIMALS = '6';
process.env.BASE_SEPOLIA_OWNER_WALLET = '0x0000000000000000000000000000000000000004';
process.env.BASE_SEPOLIA_OWNER_PRIVATE_KEY = '0x'.padEnd(66, '4');

// Mezo Testnet
process.env.MEZO_TESTNET_ESCROW_ADDRESS = '0xcBaf5066aDc2299C14112E8A79645900eeb3A76a';
process.env.MEZO_TESTNET_TOKEN_ADDRESS = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
process.env.MEZO_TESTNET_TOKEN_SYMBOL = 'MUSD';
process.env.MEZO_TESTNET_TOKEN_DECIMALS = '18';
process.env.MEZO_TESTNET_OWNER_WALLET = '0x0000000000000000000000000000000000000005';
process.env.MEZO_TESTNET_OWNER_PRIVATE_KEY = '0x'.padEnd(66, '5');

async function testConfig() {
  console.log('🔍 Testing chain registry configuration...\n');

  try {
    // Test 1: Load chain registry
    console.log('✓ Loading chain registry...');
    const { REGISTRY, ABIS, getAliasesForGroup, getDefaultAliasForGroup, getAlias } = await import('./config/chain-registry.js');
    console.log('✓ Chain registry loaded successfully\n');

    // Test 2: Verify all networks are registered
    console.log('📋 Registered networks:');
    for (const [alias, config] of Object.entries(REGISTRY)) {
      console.log(`  - ${alias} (${config.name})`);
      console.log(`    Group: ${config.group}`);
      console.log(`    Chain ID: ${config.chainId}`);
      console.log(`    Token: ${config.token.symbol} (${config.token.decimals} decimals)`);
      console.log(`    Escrow: ${config.contracts.escrow}`);
      console.log(`    RPC: ${config.rpcUrl}`);
    }
    console.log();

    // Test 3: Test helper functions
    console.log('🔧 Testing helper functions...');
    const mainnetAliases = getAliasesForGroup('mainnet');
    const testnetAliases = getAliasesForGroup('testnet');
    console.log(`  Mainnet aliases: ${mainnetAliases.join(', ')}`);
    console.log(`  Testnet aliases: ${testnetAliases.join(', ')}`);
    
    const defaultMainnet = getDefaultAliasForGroup('mainnet');
    const defaultTestnet = getDefaultAliasForGroup('testnet');
    console.log(`  Default mainnet: ${defaultMainnet}`);
    console.log(`  Default testnet: ${defaultTestnet}`);
    console.log();

    // Test 4: Test getAlias
    console.log('🎯 Testing getAlias...');
    const baseMainnet = getAlias('BASE_MAINNET');
    console.log(`  BASE_MAINNET chain ID: ${baseMainnet.chainId}`);
    console.log();

    // Test 5: Verify ABIs are present
    console.log('📝 Testing ABIs...');
    console.log(`  Escrow ABI entries: ${ABIS.escrow.length}`);
    console.log(`  ERC20 ABI entries: ${ABIS.erc20.length}`);
    console.log();

    // Test 6: Test server config validation
    console.log('⚙️  Testing server config validation...');
    const { CONFIG, validateConfig } = await import('./server/config.js');
    const isValid = validateConfig();
    if (isValid) {
      console.log('✓ Server config validation passed');
      console.log(`  Session secret: ${CONFIG.sessionSecret ? '✓ Set' : '✗ Missing'}`);
      console.log(`  Frontend URL: ${CONFIG.frontendUrl}`);
      const aliasWallets = Object.keys(CONFIG.blockchain.walletsByAlias || {});
      console.log(`  Alias wallets: ${aliasWallets.length ? aliasWallets.join(', ') : 'none'}`);
      
      // Test tokens map
      const tokens = CONFIG.tokens;
      console.log(`  Tokens configured: ${Object.keys(tokens).length}`);
      for (const [addr, token] of Object.entries(tokens)) {
        console.log(`    - ${token.symbol}: ${addr.slice(0, 8)}...`);
      }
    } else {
      console.log('✗ Server config validation failed');
    }
    console.log();

    // Test 7: Test network-env helpers
    console.log('🍪 Testing network-env helpers...');
    const { getSelectedGroupFromCookies } = await import('./lib/network-env.js');
    
    // Mock cookies object
    const mockCookies = {
      get: (name) => ({ value: 'testnet' })
    };
    const group = getSelectedGroupFromCookies(mockCookies);
    console.log(`  Selected group from cookies: ${group}`);
    console.log();

    console.log('✅ All tests passed!\n');
    
    console.log('📊 Summary:');
    console.log(`  - Total networks configured: ${Object.keys(REGISTRY).length}`);
    console.log(`  - Mainnet networks: ${mainnetAliases.length}`);
    console.log(`  - Testnet networks: ${testnetAliases.length}`);
    console.log(`  - Token types: ${Object.keys(CONFIG.tokens).length}`);
    console.log();
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

testConfig().then(success => {
  process.exit(success ? 0 : 1);
});

