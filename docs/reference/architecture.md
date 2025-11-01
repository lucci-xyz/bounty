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
│   Express Server    │
│  ┌──────────────┐   │
│  │   Webhooks   │   │
│  └──────┬───────┘   │
│         │           │
│  ┌──────▼───────┐   │
│  │   Database   │   │
│  │   (SQLite)   │   │
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

## Components

### 1. GitHub App

- Receives webhook events
- Posts comments on issues/PRs
- Handles OAuth authentication

**Events:**

- `issues.opened` → Post "Attach Bounty" comment
- `pull_request.opened` → Check eligibility
- `pull_request.closed` → Trigger payout

### 2. Express Server

**Routes:**

- `/webhooks/github` - GitHub webhook endpoint
- `/api/*` - REST API for frontend
- `/oauth/*` - GitHub OAuth flow
- `/attach-bounty` - Bounty funding page
- `/link-wallet` - Wallet linking page

**Key Files:**

- `server/index.js` - Main server
- `server/github/webhooks.js` - Webhook handlers
- `server/blockchain/contract.js` - Smart contract interface
- `server/auth/siwe.js` - SIWE authentication

### 3. Database (SQLite)

**Tables:**

```sql
bounties
- bounty_id (unique, from contract)
- repo_id, issue_number
- sponsor_address
- amount, deadline
- status (open, resolved, refunded)
- tx_hash

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
```

### 4. Smart Contracts

**BountyEscrow.sol** - Main escrow contract for holding bounty funds.

```solidity
// Create and fund a new bounty
function createBounty(
  address resolver,
  bytes32 repoIdHash,
  uint64 issueNumber,
  uint64 deadline,
  uint256 amount
) external returns (bytes32 bountyId)

// Top up an existing bounty
function fund(bytes32 bountyId, uint256 amount) external

// Cancel an open bounty (before deadline)
function cancel(bytes32 bountyId) external

// Resolve bounty and pay recipient (only resolver)
function resolve(bytes32 bountyId, address recipient) external

// Refund expired bounty (only sponsor, after deadline)
function refundExpired(bytes32 bountyId) external

// View functions
function getBounty(bytes32 bountyId) external view returns (Bounty memory)
function computeBountyId(address sponsor, bytes32 repoIdHash, uint64 issueNumber) external pure returns (bytes32)
```

**FeeVault.sol** - Protocol fee collection vault.

```solidity
// Withdraw ERC-20 tokens (owner only)
function withdraw(address token, address to, uint256 amount) external

// Sweep native ETH (owner only)
function sweepNative(address payable to) external

// Receive native ETH
receive() external payable
```

**State Machine:**

```plaintext
None → Open → Resolved
          ↓       ↓
      Canceled  Refunded (after deadline)
```

### 5. Frontend

**Pages:**

- `public/index.html` - Landing page
- `public/attach-bounty.html` - Bounty funding
- `public/link-wallet.html` - Wallet connection
- `public/refund.html` - Refund expired bounties

**Tech:**

- Vanilla JavaScript + ethers.js
- Direct wallet connection (MetaMask, etc.)
- SIWE for authentication

---

## Data Flows

### Flow 1: Sponsor Attaches Bounty

```plaintext
1. User opens GitHub issue
   ↓
2. GitHub → Webhook → Server
   ↓
3. Server posts "Attach Bounty" comment
   ↓
4. User clicks link → /attach-bounty page
   ↓
5. User connects wallet (Web3)
   ↓
6. User approves USDC
   ↓
7. User calls createBounty() on contract
   ↓
8. Transaction confirmed on Base
   ↓
9. Frontend → /api/bounty/create → Server
   ↓
10. Server saves to database
    ↓
11. Server posts bounty summary comment
    ↓
12. Server adds "bounty:$X" label
```

### Flow 2: Contributor Links Wallet

```plaintext
1. User visits /link-wallet
   ↓
2. User authenticates with GitHub OAuth
   ↓
3. User connects wallet (Web3)
   ↓
4. Frontend → /api/wallet/link → Server
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
4. Server calls resolve(bountyId, recipient) on contract
   ↓
5. USDC transferred on Base
   ↓
6. Server updates database (status: resolved)
   ↓
7. Server posts success comment with TX hash
```

---

## Security

### Authentication

- **GitHub OAuth**: Standard OAuth 2.0 flow
- **SIWE**: Sign-In With Ethereum for wallet verification
- **Sessions**: Secure httpOnly cookies

### Webhook Verification

- HMAC signature verification
- Raw body preservation for signing
- Replay attack prevention via timestamps

### Smart Contract

- OpenZeppelin audited contracts
- ReentrancyGuard on all functions
- Only resolver can call resolve()
- Sponsor-only refunds

### Private Keys

- Never committed to git
- Stored in environment variables
- Resolver wallet has minimal balance

---

## API Endpoints

### Webhooks

```plaintext
POST /webhooks/github
- Receives GitHub events
- Verifies signature
- Routes to handlers
```

### Bounties

```plaintext
GET  /api/nonce
POST /api/verify-wallet
POST /api/bounty/create
GET  /api/bounty/:bountyId
GET  /api/issue/:repoId/:issueNumber
GET  /api/contract/bounty/:bountyId
```

### Wallets

```plaintext
POST /api/wallet/link
GET  /api/wallet/:githubId
```

### OAuth

```plaintext
GET  /oauth/github
GET  /oauth/callback
GET  /oauth/user
POST /oauth/logout
```

### Other

```plaintext
GET  /health - Health check endpoint
```

> See [API Documentation](api.md) for detailed endpoint reference with request/response examples.

---

## Database Schema

### Indexes

```sql
CREATE INDEX idx_bounties_repo ON bounties(repo_id, issue_number);
CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_pr_claims_bounty ON pr_claims(bounty_id);
CREATE INDEX idx_wallet_github ON wallet_mappings(github_id);
```

### Relationships

- `bounties.bounty_id` → Unique contract identifier
- `pr_claims.bounty_id` → FOREIGN KEY to `bounties.bounty_id`
- `wallet_mappings.github_id` → Used to find recipient address

---

## Blockchain Integration

### Contract Functions Used

**From Frontend (User-initiated):**

- `createBounty()` - Sponsor creates and funds bounty
- `fund()` - Sponsor tops up existing bounty
- `cancel()` - Sponsor cancels bounty before deadline
- `refundExpired()` - Sponsor refunds expired bounty
- `getBounty()` - Read bounty state from contract

**From Backend (Automated):**

- `resolve()` - Resolver pays out bounty to recipient
- `computeBountyId()` - Generate deterministic bounty ID
- `getBounty()` - Query bounty state for validation

**FeeVault (Owner only):**

- `withdraw()` - Withdraw collected protocol fees (ERC-20)
- `sweepNative()` - Sweep collected ETH fees

### Transaction Flow

1. Frontend calls contract with ethers.js
2. User signs transaction in MetaMask
3. Transaction sent to Base Sepolia
4. Wait for confirmation (1-2 blocks)
5. Frontend notifies backend with TX hash
6. Backend updates database

---

## Environment Variables

### Required

```bash
GITHUB_APP_ID
GITHUB_PRIVATE_KEY_PATH
GITHUB_WEBHOOK_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
RESOLVER_PRIVATE_KEY
SESSION_SECRET
FRONTEND_URL
```

### Pre-configured

```bash
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
ESCROW_CONTRACT=0xb30283b5412B89d8B8dE3C6614aE2754a4545aFD
USDC_CONTRACT=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

---

## Error Handling

### Webhook Failures

- Invalid signature → 401 response
- Unhandled event → Log and 200 response
- Processing error → Log, 500 response, don't retry

### Blockchain Failures

- Transaction reverted → Log error, notify user
- Out of gas → Check resolver balance
- Network timeout → Retry with exponential backoff

### Database Failures

- Constraint violation → Check for duplicates
- Connection lost → Auto-reconnect (WAL mode)

---

## Performance Considerations

### Database

- WAL mode for better concurrency
- Indexed queries for fast lookups
- Prepared statements for security

### Blockchain

- Batch read operations where possible
- Cache contract ABI
- Use events for historical data

### Scalability

- Current: Handles 100+ repos easily
- For scale: Switch to PostgreSQL, add Redis, queue blockchain calls

---

## Monitoring Points

- Webhook delivery success rate
- Bounty creation rate
- Payout success rate
- Resolver wallet balance
- Database size growth
- API response times
- Blockchain gas costs

---

## Tech Decisions

### Why SQLite?

- Zero configuration
- Fast for read-heavy workload
- Sufficient for most use cases
- Easy to backup and migrate

### Why ethers.js v6?

- Industry standard
- Great TypeScript support
- Comprehensive documentation
- Active maintenance

### Why SIWE?

- Decentralized authentication
- No backend signature verification needed
- Standard protocol
- Works with any wallet

### Why Base Sepolia?

- Low gas fees
- Fast block times (2 seconds)
- Good developer tools
- Easy bridge from Ethereum

---

## Smart Contract Details

### BountyEscrow Architecture

**State Management:**

- Each bounty has a unique `bountyId` computed as `keccak256(sponsor, repoIdHash, issueNumber)`
- Bounty status transitions: `None → Open → (Resolved | Refunded | Canceled)`
- Terminal states are final (no state changes after)

**Access Control:**

- `createBounty()`: Anyone can create (becomes sponsor)
- `fund()` / `cancel()` / `refundExpired()`: Only sponsor
- `resolve()`: Only designated resolver (set at creation)

**Fee Mechanism:**

- Protocol fee calculated on resolution: `fee = amount * feeBps / 10000`
- Net payout to recipient: `amount - fee`
- Fee sent to `FeeVault` contract
- Maximum fee capped at 10% (1000 bps)

### FeeVault Architecture

**Purpose:**

- Receives protocol fees from BountyEscrow resolutions
- Owner-controlled withdrawals for fee collection
- Supports both ERC-20 tokens and native ETH

**Security:**

- Only owner can withdraw
- Non-reentrant guards
- Generic vault (accepts any ERC-20)

---

## Future Enhancements

- [ ] Multi-token support (DAI, USDT)
- [ ] Milestone-based bounties
- [ ] Dispute resolution
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Mainnet deployment
- [ ] Multi-network support (optimism, arbitrum)
