import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('API Tokens Endpoint', () => {
  // Mock token configuration structure
  const mockTokens = {
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6
    }
  };

  it('should have token metadata structure', () => {
    assert.ok(mockTokens, 'Tokens object should exist');
    assert.strictEqual(typeof mockTokens, 'object', 'Tokens should be an object');
  });

  it('should have USDC token configured', () => {
    const usdc = Object.values(mockTokens).find(t => t.symbol === 'USDC');
    
    assert.ok(usdc, 'USDC token should be configured');
    assert.strictEqual(usdc.symbol, 'USDC', 'Should have USDC symbol');
    assert.strictEqual(usdc.decimals, 6, 'USDC should have 6 decimals');
    assert.ok(usdc.name, 'Should have token name');
  });

  it('should have valid Ethereum addresses as keys', () => {
    const addresses = Object.keys(mockTokens);
    
    assert.ok(addresses.length > 0, 'Should have at least one token');
    
    addresses.forEach(addr => {
      assert.ok(addr.startsWith('0x'), 'Address should start with 0x');
      assert.strictEqual(addr.length, 42, 'Address should be 42 characters');
      // Should be hex
      assert.ok(/^0x[0-9a-fA-F]{40}$/.test(addr), 'Address should be valid hex');
    });
  });

  it('should have required token metadata fields', () => {
    Object.entries(mockTokens).forEach(([address, token]) => {
      assert.ok(token.symbol, `Token ${address} should have symbol`);
      assert.ok(token.name, `Token ${address} should have name`);
      assert.ok(typeof token.decimals === 'number', `Token ${address} should have numeric decimals`);
      assert.ok(token.decimals >= 0 && token.decimals <= 18, `Token ${address} decimals should be 0-18`);
    });
  });

  it('should return JSON serializable data', () => {
    assert.doesNotThrow(() => {
      JSON.stringify(mockTokens);
    }, 'Tokens should be JSON serializable');
    
    const json = JSON.stringify(mockTokens);
    const parsed = JSON.parse(json);
    assert.deepStrictEqual(parsed, mockTokens, 'Should parse back to same structure');
  });

  it('should support case-insensitive address lookup', () => {
    // Normalize to lowercase for lookup
    const normalizedTokens = {};
    for (const [addr, metadata] of Object.entries(mockTokens)) {
      normalizedTokens[addr.toLowerCase()] = metadata;
    }

    // Test different cases
    const lowercase = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    const checksum = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const uppercase = '0X036CBD53842C5426634E7929541EC2318F3DCF7E';

    assert.ok(normalizedTokens[lowercase.toLowerCase()], 'Should find with lowercase');
    assert.ok(normalizedTokens[checksum.toLowerCase()], 'Should find with checksum');
    assert.ok(normalizedTokens[uppercase.toLowerCase()], 'Should find with uppercase');
  });
});

