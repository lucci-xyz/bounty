# BountyPay Developer Guide

Quick reference for developers working on BountyPay.

## Project Structure

```
bounty/
├── app/                    # Next.js app directory (pages, API routes)
├── components/             # React components
├── server/                 # Backend services
│   ├── services/
│   │   └── database/      # Database queries (refactored into modules)
│   ├── blockchain/        # Smart contract interactions
│   ├── github/            # GitHub API integration
│   ├── auth/              # SIWE authentication
│   └── config.js          # Configuration
├── contracts/              # Solidity smart contracts
├── prisma/                 # Database schema
├── config/                 # Network configurations
└── tests/                  # Test files
```

## Key Technologies

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: ethers.js for Base Sepolia & Mezo Testnet
- **Auth**: Sign-In With Ethereum (SIWE) + iron-session
- **GitHub**: Octokit for GitHub App integration
- **Styling**: Tailwind CSS + CSS variables

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp ENV_EXAMPLE.txt .env
# Edit .env with your values

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Database Queries

Database operations are in `server/services/database/`:

```javascript
import { findBountyById, createBounty } from '@/server/services/database/bountyQueries';
import { createOrUpdateWallet } from '@/server/services/database/walletQueries';
```

Legacy imports still work:

```javascript
import { bountyQueries, walletQueries } from '@/server/db/prisma';
```

## Smart Contracts

Interact with blockchain via `server/blockchain/contract.js`:

```javascript
import { resolveBountyOnNetwork, computeBountyIdOnNetwork } from '@/server/blockchain/contract';

// Resolve bounty on specific network
const result = await resolveBountyOnNetwork(bountyId, recipientAddress, 'BASE_SEPOLIA');
```

## GitHub Integration

GitHub API calls via `server/github/client.js`:

```javascript
import { getOctokit, postIssueComment } from '@/server/github/client';

const octokit = await getOctokit(installationId);
await postIssueComment(octokit, owner, repo, issueNumber, body);
```

## API Routes

All API routes follow Next.js 15 App Router conventions:

- `app/api/bounties/` - Bounty management
- `app/api/wallet/` - Wallet linking
- `app/api/user/` - User profile
- `app/api/webhooks/github/` - GitHub webhook handler

## Environment Variables

Critical variables:

- `GITHUB_APP_ID` - GitHub App ID
- `GITHUB_PRIVATE_KEY` or `GITHUB_PRIVATE_KEY_PATH` - GitHub App private key
- `ESCROW_CONTRACT` - Smart contract address
- `RESOLVER_PRIVATE_KEY` - Wallet key for resolving bounties
- `DATABASE_URL` - PostgreSQL connection string

See `ENV_EXAMPLE.txt` for complete list.

## Testing

```bash
# Run all tests
npm test

# Run specific test
node --test tests/api-tokens.test.js
```

## Common Tasks

### Add a new API endpoint

1. Create `app/api/your-endpoint/route.js`
2. Export GET/POST functions
3. Use database queries from `server/services/database/`

### Add database query

1. Edit appropriate file in `server/services/database/`
2. Export new function
3. Add to `index.js` exports if needed

### Update smart contract

1. Edit contract in `contracts/`
2. Deploy to testnet
3. Update contract addresses in `.env`
4. Update ABI in `server/blockchain/contract.js` if needed

## Documentation

- [Getting Started](docs/guides/getting-started.md) - User guide
- [Architecture](docs/reference/architecture.md) - System design
- [API Reference](docs/reference/api.md) - API documentation
- [Smart Contracts](docs/reference/smart-contracts.md) - Contract details
- [Refactoring Notes](REFACTORING.md) - Recent code improvements

## Need Help?

- GitHub Issues: Report bugs and request features
- Documentation: Check detailed guides in `docs/`
- Code Comments: Functions have JSDoc comments explaining behavior
