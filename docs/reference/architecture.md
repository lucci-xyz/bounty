# Architecture

Technical overview of BountyPay's system design and data flows.

---

## System Overview

```plaintext
┌─────────────┐
│   GitHub    │
│   Issues    │
└──────┬──────┘
       │ Webhooks
       ▼
┌─────────────────────┐
│    Next.js App      │
│  ┌──────────────┐   │
│  │ API Routes   │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   Database   │   │
│  │  (Postgres)  │   │
│  └──────────────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │  Blockchain  │   │
│  └──────┬───────┘   │
└─────────┼───────────┘
          │
          ▼
   ┌──────────────┐
   │ Base Sepolia │
   │   Contract   │
   └──────────────┘
```

---

## Tech Stack

- **Frontend**: Next.js 15 (React 19, App Router)
- **Backend**: Next.js API Routes
- **Database**: Prisma + Postgres
- **Deployment**: Vercel
- **Session**: iron-session (encrypted cookies)
- **Auth**: SIWE (Sign-In With Ethereum)
- **Blockchain**: ethers.js v6
- **Wallet**: RainbowKit + wagmi

---

## Components

### 1. GitHub App

- Receives webhook events
- Posts comments on issues/PRs
- Handles OAuth authentication

**Events:**
- `issues.opened` → Post "Attach Bounty" comment
- `pull_request.opened` → Check eligibility
- `pull_request.closed` → Trigger payout

### 2. Next.js Application

**Routes:**
- `/api/webhooks/github` - GitHub webhook endpoint
- `/api/bounty/*` - Bounty management
- `/api/wallet/*` - Wallet operations
- `/api/oauth/*` - GitHub OAuth flow
- `/attach-bounty` - Bounty funding page
- `/link-wallet` - Wallet linking page
- `/refund` - Refund page

**Key Files:**
- `app/api/*/route.js` - API route handlers
- `server/github/webhooks.js` - Webhook logic
- `server/blockchain/contract.js` - Smart contract interface
- `server/auth/siwe.js` - SIWE authentication
- `server/db/prisma.js` - Database queries

### 3. Database (Prisma + Postgres)

**Tables:**

```sql
bounties
- bounty_id (unique, from contract)
- repo_id, issue_number
- sponsor_address, sponsor_github_id
- amount, deadline
- status (open, resolved, refunded)
- tx_hash
- network (BASE_SEPOLIA, MEZO_TESTNET)
- environment (stage, prod)

wallet_mappings
- github_id (unique)
- github_username
- wallet_address
- verified_at

pr_claims
- bounty_id
- pr_number, pr_author_github_id
- status (pending, paid, failed)
- tx_hash

users
- id (auto-increment)
- github_id (unique)
- github_username, email, avatar_url
- preferences (JSON)
- created_at, updated_at

allowlists
- id (auto-increment)
- user_id, bounty_id, repo_id
- allowed_address
- created_at

notification_preferences
- id (auto-increment)
- user_id (unique)
- email_on_claim, email_on_merge, email_on_expiry
- created_at, updated_at
```

### 4. Smart Contracts

**BountyEscrow.sol** - Main escrow contract

```solidity
// Create and fund a new bounty
function createBounty(
  address resolver,
  bytes32 repoIdHash,
  uint64 issueNumber,
  uint64 deadline,
  uint256 amount
) external returns (bytes32 bountyId)

// Resolve bounty and pay recipient (only resolver)
function resolve(bytes32 bountyId, address recipient) external

// Refund expired bounty (only sponsor, after deadline)
function refundExpired(bytes32 bountyId) external
```

**State Machine:**

```plaintext
None → Open → Resolved
          ↓       ↓
      Canceled  Refunded (after deadline)
```

---

## Data Flows

### Flow 1: Sponsor Attaches Bounty

```plaintext
1. User opens GitHub issue
   ↓
2. GitHub → Webhook → /api/webhooks/github
   ↓
3. Server posts "Attach Bounty" comment
   ↓
4. User clicks link → /attach-bounty page
   ↓
5. User connects wallet (RainbowKit)
   ↓
6. User approves USDC
   ↓
7. User calls createBounty() on contract
   ↓
8. Transaction confirmed on Base
   ↓
9. Frontend → /api/bounty/create
   ↓
10. Server saves to Postgres via Prisma
    ↓
11. Server posts bounty summary comment
    ↓
12. Server adds bounty label
```

### Flow 2: Contributor Links Wallet

```plaintext
1. User visits /link-wallet
   ↓
2. User authenticates with GitHub OAuth
   ↓
3. User connects wallet (SIWE)
   ↓
4. Frontend → /api/wallet/link
   ↓
5. Server saves github_id ↔ wallet_address mapping
```

### Flow 3: PR Merged → Payout

```plaintext
1. PR merged → GitHub webhook
   ↓
2. Server checks if PR closes bounty issue
   ↓
3. Server queries wallet_mappings for solver's address
   ↓
4. Server checks allowlist (if configured)
   ↓
5. Server calls resolve(bountyId, recipient) on contract
   ↓
6. USDC transferred on Base
   ↓
7. Server updates Postgres (status: resolved)
   ↓
8. Server posts success comment with TX hash
```

### Flow 4: User Management & Allowlists

```plaintext
1. User authenticates with GitHub OAuth
   ↓
2. Session stores githubId, username, email, avatarUrl
   ↓
3. On first bounty creation → User record auto-created
   ↓
4. Sponsor can configure allowlists per bounty or repo
   ↓
5. Only allowlisted addresses can claim bounties
   ↓
6. Allowlists checked during payout validation
```

---

## User Management

### Unified Account System

BountyPay uses a unified account system where users are no longer separated into "sponsors" and "contributors". Every user has a single account that can perform both roles:

**User Model:**
- Automatically created on first bounty creation or explicit registration
- Stores GitHub identity (ID, username, email, avatar)
- Supports user preferences (JSON field for extensibility)
- Links to wallet mappings for payments

**Key Features:**
1. **Auto-Creation**: Users are automatically created when they fund their first bounty (if GitHub session exists)
2. **Single Identity**: One GitHub account = one user, regardless of role
3. **Flexible Roles**: Users can both sponsor bounties and claim rewards
4. **Profile Management**: Users can view their profile, bounties, and stats

### Allowlist System

Sponsors can restrict who can claim their bounties using allowlists:

**Allowlist Types:**
1. **Bounty-Level**: Restrict specific bounty to certain addresses
2. **Repo-Level**: Apply allowlist to all bounties in a repository

**Use Cases:**
- Whitelist trusted contributors
- Restrict bounties to team members
- Control who can claim high-value bounties

**Validation:**
- Checked during PR merge payout flow
- If allowlist exists and address not on it → payout blocked
- If no allowlist configured → anyone can claim

### Notification Preferences

Users can configure email notifications for:
- PR claims on their bounties
- PR merges (payout triggers)
- Bounty expiration warnings

---

## Security

### Authentication
- **GitHub OAuth**: Standard OAuth 2.0 flow
- **SIWE**: Sign-In With Ethereum for wallet verification
- **Sessions**: iron-session with encrypted cookies

### Webhook Verification
- HMAC signature verification
- Raw body preservation for signing
- Replay attack prevention

### Smart Contract
- OpenZeppelin audited contracts
- ReentrancyGuard on all functions
- Only resolver can call resolve()

### Private Keys
- Never committed to git
- Stored in environment variables
- Resolver wallet has minimal balance

---

## API Endpoints

### Webhooks
```plaintext
POST /api/webhooks/github - GitHub events
```

### Bounties
```plaintext
GET  /api/nonce
POST /api/verify-wallet
POST /api/bounty/create
GET  /api/bounty/[bountyId]
GET  /api/bounties/open
GET  /api/issue/[repoId]/[issueNumber]
GET  /api/contract/bounty/[bountyId]
GET  /api/stats
```

### Users
```plaintext
GET  /api/user/profile
GET  /api/user/bounties
GET  /api/user/stats
```

### Allowlists
```plaintext
GET  /api/allowlist/[bountyId]
POST /api/allowlist/[bountyId]
```

### Wallets
```plaintext
POST /api/wallet/link
GET  /api/wallet/[githubId]
```

### OAuth
```plaintext
GET  /api/oauth/github
GET  /api/oauth/callback
GET  /api/oauth/user
POST /api/oauth/logout
```

> See [API Documentation](api.md) for detailed reference.

---

## Database Schema

### Indexes

```sql
CREATE INDEX idx_bounties_repo ON bounties(repo_id, issue_number);
CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_bounties_environment ON bounties(environment);
CREATE INDEX idx_pr_claims_bounty ON pr_claims(bounty_id);
CREATE INDEX idx_wallet_github ON wallet_mappings(github_id);
CREATE INDEX idx_users_github ON users(github_id);
CREATE INDEX idx_allowlist_user ON allowlists(user_id);
CREATE INDEX idx_allowlist_bounty ON allowlists(bounty_id);
CREATE INDEX idx_allowlist_repo ON allowlists(repo_id);
```

### Relationships
- `bounties.bounty_id` → Unique contract identifier
- `bounties.sponsor_github_id` → References `users.github_id`
- `pr_claims.bounty_id` → References `bounties.bounty_id`
- `wallet_mappings.github_id` → Used to find recipient address
- `users.github_id` → Unique GitHub user identifier
- `allowlists.user_id` → References `users.id`
- `allowlists.bounty_id` → References `bounties.bounty_id` (optional)
- `allowlists.repo_id` → Repository ID for repo-level allowlists (optional)
- `notification_preferences.user_id` → References `users.id`

---

## Blockchain Integration

### Contract Functions

**From Frontend (User):**
- `createBounty()` - Sponsor creates bounty
- `refundExpired()` - Sponsor refunds expired bounty
- `getBounty()` - Read bounty state

**From Backend (Automated):**
- `resolve()` - Resolver pays out bounty
- `computeBountyId()` - Generate deterministic ID
- `getBounty()` - Query bounty state

### Transaction Flow
1. Frontend calls contract with ethers.js
2. User signs transaction in MetaMask
3. Transaction sent to Base Sepolia
4. Wait for confirmation (1-2 blocks)
5. Frontend notifies backend with TX hash
6. Backend updates Postgres

---

## Environment Variables

### Required
```bash
SESSION_SECRET
GITHUB_APP_ID
GITHUB_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
FRONTEND_URL
ENV_TARGET
DATABASE_URL
DIRECT_DATABASE_URL
# Network owner wallets (one pair per supported alias)
BASE_SEPOLIA_OWNER_WALLET
BASE_SEPOLIA_OWNER_PRIVATE_KEY
MEZO_TESTNET_OWNER_WALLET
MEZO_TESTNET_OWNER_PRIVATE_KEY
```

### Optional
```bash
NEXT_PUBLIC_ENV_TARGET=local          # Enable local testing mode
NEXT_PUBLIC_USE_DUMMY_DATA=true       # Use dummy data instead of API calls
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  # WalletConnect project ID
COOKIE_DOMAIN                         # Auto-detected from FRONTEND_URL

# Network configuration (alias-based)
BLOCKCHAIN_SUPPORTED_TESTNET_ALIASES=BASE_SEPOLIA
BLOCKCHAIN_DEFAULT_TESTNET_ALIAS=BASE_SEPOLIA
BASE_SEPOLIA_ESCROW_ADDRESS=0x3C1AF89cf9773744e0DAe9EBB7e3289e1AeCF0E7
BASE_SEPOLIA_TOKEN_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
BASE_SEPOLIA_TOKEN_SYMBOL=USDC
BASE_SEPOLIA_TOKEN_DECIMALS=6
# Optional fallback if you prefer a single wallet for every network
# RESOLVER_PRIVATE_KEY=0x...
```

---

## Deployment

### Vercel Platform
- Automatic deployments from GitHub
- Environment variables per environment (Preview, Production)
- Serverless function execution
- Edge network distribution

### Database
- Hosted on Prisma Postgres
- Connection pooling via Prisma Accelerate
- Automatic backups

---

## Error Handling

### Webhook Failures
- Invalid signature → 401 response
- Unhandled event → Log and 200 response
- Processing error → Log, 500 response

### Blockchain Failures
- Transaction reverted → Log error, notify user
- Out of gas → Check resolver balance
- Network timeout → Retry with backoff

### Database Failures
- Connection issues → Auto-reconnect via Prisma
- Constraint violation → Check for duplicates

---

## Performance

### Database
- Connection pooling via Prisma Accelerate
- Indexed queries for fast lookups
- Query optimization with Prisma

### Blockchain
- Batch read operations where possible
- Cache contract ABI
- Use events for historical data

### Scalability
- Serverless architecture scales automatically
- Stateless API routes
- Database connection pooling

---

## Monitoring Points

- Webhook delivery success rate
- Bounty creation rate
- Payout success rate
- Resolver wallet balance
- Database connection pool
- API response times
- Blockchain gas costs

---

## Tech Decisions

### Why Next.js?
- Full-stack React framework
- API routes for backend
- Excellent developer experience
- Vercel-optimized deployment

### Why Prisma?
- Type-safe database queries
- Great TypeScript support
- Easy migrations
- Connection pooling

### Why Vercel?
- Zero-config Next.js deployment
- Automatic scaling
- Preview deployments
- Edge network

### Why SIWE?
- Decentralized authentication
- Standard protocol
- Works with any wallet
- No backend signature verification

---

## Future Enhancements

- [ ] Multi-token support (DAI, USDT)
- [ ] Milestone-based bounties
- [ ] Dispute resolution
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Mainnet deployment
