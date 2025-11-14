# BountyPay Tests

Functional tests for the token analytics implementation.

## Running Tests

```bash
# Run all tests
node --test tests/

# Run specific test file
node --test tests/db-stats.test.js

# Run with coverage (Node 20+)
node --test --experimental-test-coverage tests/
```

## Test Coverage

### Database Layer (`db-stats.test.js`)

- Token aggregation queries
- TVL calculation (open bounties only)
- Average amount calculation
- Overall platform statistics
- Recent activity ordering
- Empty database handling

### API Layer (`api-stats.test.js`)

- **TVL normalization** - Verifies `byToken[token].tvl` values are normalized by token decimals
- **totalValue normalization** - Verifies `byToken[token].totalValue` values are normalized
- **avgAmount normalization** - Verifies `byToken[token].avgAmount` values are normalized
- **Consistency check** - Verifies sum of `byToken` TVLs matches `overall.total_tvl`
- **Raw value prevention** - Ensures raw database values are never returned in `byToken`
- **Unknown token handling** - Tests default 18 decimals for unknown tokens

### Configuration (`api-tokens.test.js`)

- Token metadata availability
- USDC configuration validation
- Address format validation
- Required fields validation

### Frontend Logic (`frontend-token-lookup.test.js`)

- Case-insensitive address lookups
- Checksummed address handling
- Uppercase address handling
- Unknown token fallback
- Dynamic metadata priority
- Metadata key normalization

## Test Data

> **Note**: These tests use in-memory SQLite and may need updating to use Prisma + Postgres. The project has migrated from SQLite to Prisma, so test setup may require changes.

Tests use in-memory SQLite databases with the following test scenario:

- **USDC**: 5 bounties (3 resolved, 2 open)
- **MUSD**: 3 bounties (2 resolved, 1 open)
- **Total**: 8 bounties, 62.5% resolution rate

This matches the acceptance criteria test data from the original issue.

## Design Principles

Following Apple engineering standards:

- ✅ **Essential tests only** - No fluff, high-value coverage
- ✅ **Fast execution** - In-memory databases, no external dependencies
- ✅ **Self-contained** - Each test creates its own isolated environment
- ✅ **Clear assertions** - One concept per test
- ✅ **Zero dependencies** - Uses Node's built-in test runner

## CI/CD Integration

Add to `package.json`:

```json
{
  "scripts": {
    "test": "node --test tests/"
  }
}
```

Then run: `npm test`
