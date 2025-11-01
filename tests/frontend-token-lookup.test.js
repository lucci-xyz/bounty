import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Frontend Token Lookup (Case Insensitivity)', () => {
  // Simulate the frontend getTokenInfo function
  const KNOWN_TOKENS = {
    '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
      symbol: 'USDC',
      decimals: 6
    }
  };

  let tokenMetadata = {};

  function getTokenInfo(address) {
    const normalizedAddress = address.toLowerCase();
    
    let token = tokenMetadata[normalizedAddress];
    
    if (!token) {
      token = KNOWN_TOKENS[normalizedAddress];
    }
    
    if (!token) {
      return { symbol: 'UNKNOWN', decimals: 18, class: 'token-musd' };
    }
    
    const badgeClass = token.symbol === 'USDC' ? 'token-usdc' : 'token-musd';
    return { ...token, class: badgeClass };
  }

  it('should handle lowercase addresses', () => {
    const result = getTokenInfo('0x036cbd53842c5426634e7929541ec2318f3dcf7e');
    
    assert.strictEqual(result.symbol, 'USDC', 'Should find USDC');
    assert.strictEqual(result.decimals, 6, 'Should have correct decimals');
    assert.strictEqual(result.class, 'token-usdc', 'Should have correct class');
  });

  it('should handle checksummed addresses', () => {
    const result = getTokenInfo('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    
    assert.strictEqual(result.symbol, 'USDC', 'Should find USDC with checksum');
    assert.strictEqual(result.decimals, 6, 'Should have correct decimals');
  });

  it('should handle uppercase addresses', () => {
    const result = getTokenInfo('0X036CBD53842C5426634E7929541EC2318F3DCF7E');
    
    assert.strictEqual(result.symbol, 'USDC', 'Should find USDC uppercase');
    assert.strictEqual(result.decimals, 6, 'Should have correct decimals');
  });

  it('should fallback to UNKNOWN for unrecognized tokens', () => {
    const result = getTokenInfo('0xunknownaddress0000000000000000000000');
    
    assert.strictEqual(result.symbol, 'UNKNOWN', 'Should return UNKNOWN');
    assert.strictEqual(result.decimals, 18, 'Should use 18 decimals fallback');
    assert.strictEqual(result.class, 'token-musd', 'Should use musd class');
  });

  it('should prefer dynamic metadata over hardcoded', () => {
    // Simulate loaded metadata
    tokenMetadata = {
      '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      }
    };

    const result = getTokenInfo('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    
    assert.strictEqual(result.symbol, 'USDC', 'Should find in dynamic metadata');
    assert.ok(result.name, 'Should have name from dynamic metadata');
  });

  it('should normalize dynamic metadata keys on load', () => {
    // Simulate backend response with mixed-case keys
    const backendTokens = {
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      }
    };

    // Normalize keys
    tokenMetadata = {};
    for (const [address, metadata] of Object.entries(backendTokens)) {
      tokenMetadata[address.toLowerCase()] = metadata;
    }

    // Should find with any case
    const result1 = getTokenInfo('0x036cbd53842c5426634e7929541ec2318f3dcf7e');
    const result2 = getTokenInfo('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    const result3 = getTokenInfo('0X036CBD53842C5426634E7929541EC2318F3DCF7E');

    assert.strictEqual(result1.symbol, 'USDC', 'Lowercase should work');
    assert.strictEqual(result2.symbol, 'USDC', 'Checksum should work');
    assert.strictEqual(result3.symbol, 'USDC', 'Uppercase should work');
  });
});

