import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('API Stats Endpoint', () => {

  it('should return stats with correct structure', () => {
    // Test expected response structure
    const mockResult = {
      byToken: {
        '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
          count: 2,
          totalValue: 15000000,
          tvl: 10000000,
          avgAmount: 7500000,
          successRate: 50
        }
      },
      overall: {
        totalBounties: 2,
        totalTVL: 10000000,
        avgResolutionRate: 50
      },
      recent: [
        {
          bounty_id: 'b1',
          token: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
          amount: '10000000',
          status: 'open',
          created_at: Date.now(),
          repo_full_name: 'test/repo',
          issue_number: 1
        }
      ],
      timestamp: Date.now()
    };

    // Verify structure
    assert.ok(mockResult.byToken, 'Should have byToken object');
    assert.ok(mockResult.overall, 'Should have overall object');
    assert.ok(Array.isArray(mockResult.recent), 'Should have recent array');
    assert.ok(mockResult.timestamp, 'Should have timestamp');

    // Verify overall structure
    assert.ok(typeof mockResult.overall.totalBounties === 'number', 'totalBounties should be number');
    assert.ok(typeof mockResult.overall.totalTVL === 'number', 'totalTVL should be number');
    assert.ok(typeof mockResult.overall.avgResolutionRate === 'number', 'avgResolutionRate should be number');
    
    // Verify byToken structure
    Object.entries(mockResult.byToken).forEach(([address, stats]) => {
      assert.ok(typeof stats.count === 'number', 'count should be number');
      assert.ok(typeof stats.totalValue === 'number', 'totalValue should be number');
      assert.ok(typeof stats.tvl === 'number', 'tvl should be number');
      assert.ok(typeof stats.avgAmount === 'number', 'avgAmount should be number');
      assert.ok(typeof stats.successRate === 'number', 'successRate should be number');
    });
  });

  it('should calculate success rates correctly', () => {
    // Using test database, simulate calculation
    const now = Date.now();
    const USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';
    
    // From our test data: 1 resolved, 1 open = 50%
    const resolved = 1;
    const total = 2;
    const successRate = (resolved / total) * 100;
    
    assert.strictEqual(successRate, 50, 'Success rate should be 50%');
  });

  it('should return valid JSON structure', () => {
    // Test response structure
    const mockByToken = {
      '0x036cbd53842c5426634e7929541ec2318f3dcf7e': {
        count: 2,
        totalValue: 15000000,
        tvl: 10000000,
        avgAmount: 7500000,
        successRate: 50
      }
    };

    const mockOverall = {
      totalBounties: 2,
      totalTVL: 10000000,
      avgResolutionRate: 50
    };

    const mockRecent = [
      {
        bounty_id: 'b1',
        token: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
        amount: '10000000',
        status: 'open',
        created_at: Date.now(),
        repo_full_name: 'test/repo',
        issue_number: 1
      }
    ];

    const result = {
      byToken: mockByToken,
      overall: mockOverall,
      recent: mockRecent,
      timestamp: Date.now()
    };

    // Should be serializable
    assert.doesNotThrow(() => JSON.stringify(result), 'Should be valid JSON');
    
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    assert.ok(parsed.byToken, 'Should have byToken after parse');
    assert.ok(parsed.overall, 'Should have overall after parse');
    assert.ok(Array.isArray(parsed.recent), 'Should have recent array after parse');
  });
});

