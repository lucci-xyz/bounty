# API Documentation

Complete API reference for BountyPay endpoints.

**Base URL:** `https://your-domain.com`

---

## Authentication

### SIWE (Sign-In With Ethereum)

For wallet-related endpoints, users must authenticate using SIWE:

1. Get nonce: `GET /api/nonce`
2. Sign message with wallet
3. Verify: `POST /api/verify-wallet`
4. Wallet address stored in session

### GitHub OAuth

For GitHub-related operations:

1. Initiate: `GET /oauth/github`
2. User authorizes on GitHub
3. Callback: `GET /oauth/callback`
4. GitHub info stored in session

---

## Endpoints

### Authentication Endpoints

#### GET /api/nonce

Generate a SIWE nonce for wallet authentication.

**Response:**

```json
{
  "nonce": "random-string-here"
}
```

**Example:**

```bash
curl https://your-domain.com/api/nonce
```

---

#### POST /api/verify-wallet

Verify SIWE signature and store wallet in session.

**Request Body:**

```json
{
  "message": "string (SIWE message)",
  "signature": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "address": "0x..."
}
```

**Errors:**

- `400` - Missing message or signature
- `401` - Invalid signature

**Example:**

```bash
curl -X POST https://your-domain.com/api/verify-wallet \
  -H "Content-Type: application/json" \
  -d '{
    "message": "...",
    "signature": "0x..."
  }'
```

---

### Bounties

#### POST /api/bounty/create

Record bounty creation after blockchain transaction. Called by frontend after successful `createBounty()` transaction.

**Request Body:**

```json
{
  "repoFullName": "owner/repo",
  "repoId": 123456789,
  "issueNumber": 42,
  "sponsorAddress": "0x...",
  "amount": "1000000000",
  "deadline": 1735689600,
  "txHash": "0x...",
  "installationId": 12345678
}
```

**Response:**

```json
{
  "success": true,
  "bountyId": "0x..."
}
```

**Errors:**

- `400` - Missing required fields
- `500` - Server error

**Example:**

```bash
curl -X POST https://your-domain.com/api/bounty/create \
  -H "Content-Type: application/json" \
  -d '{
    "repoFullName": "owner/repo",
    "repoId": 123456789,
    "issueNumber": 42,
    "sponsorAddress": "0x1234...",
    "amount": "1000000000",
    "deadline": 1735689600,
    "txHash": "0xabcd...",
    "installationId": 12345678
  }'
```

---

#### GET /api/bounty/:bountyId

Get bounty details from database.

**Parameters:**

- `bountyId` (path) - Bounty ID (bytes32 hex string)

**Response:**

```json
{
  "id": 1,
  "bounty_id": "0x...",
  "repo_full_name": "owner/repo",
  "repo_id": 123456789,
  "issue_number": 42,
  "sponsor_address": "0x...",
  "sponsor_github_id": 12345,
  "amount": "1000000000",
  "deadline": 1735689600,
  "status": "open",
  "tx_hash": "0x...",
  "created_at": 1704067200,
  "updated_at": 1704067200,
  "pinned_comment_id": 123456789
}
```

**Errors:**

- `404` - Bounty not found

**Example:**

```bash
curl https://your-domain.com/api/bounty/0x1234...
```

---

#### GET /api/issue/:repoId/:issueNumber

Get all bounties for a specific issue.

**Parameters:**

- `repoId` (path) - Repository ID (integer)
- `issueNumber` (path) - Issue number (integer)

**Response:**

```json
{
  "bounties": [
    {
      "id": 1,
      "bounty_id": "0x...",
      "repo_full_name": "owner/repo",
      "repo_id": 123456789,
      "issue_number": 42,
      "sponsor_address": "0x...",
      "amount": "1000000000",
      "deadline": 1735689600,
      "status": "open",
      ...
    }
  ]
}
```

**Example:**

```bash
curl https://your-domain.com/api/issue/123456789/42
```

---

#### GET /api/contract/bounty/:bountyId

Get bounty details directly from blockchain contract.

**Parameters:**

- `bountyId` (path) - Bounty ID (bytes32 hex string)

**Response:**

```json
{
  "repoIdHash": "0x...",
  "sponsor": "0x...",
  "resolver": "0x...",
  "amount": "1000000000",
  "deadline": "1735689600",
  "issueNumber": "42",
  "status": 1
}
```

**Status Values:**

- `0` - None
- `1` - Open
- `2` - Resolved
- `3` - Refunded
- `4` - Canceled

**Example:**

```bash
curl https://your-domain.com/api/contract/bounty/0x1234...
```

---

### Wallets

#### POST /api/wallet/link

Link GitHub account to wallet address. Requires both GitHub OAuth and SIWE authentication.

**Request Body:**

```json
{
  "githubId": 12345,
  "githubUsername": "username",
  "walletAddress": "0x..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Wallet linked successfully"
}
```

**Errors:**

- `400` - Missing required fields
- `401` - Wallet not authenticated (SIWE not completed)

**Example:**

```bash
curl -X POST https://your-domain.com/api/wallet/link \
  -H "Content-Type: application/json" \
  -d '{
    "githubId": 12345,
    "githubUsername": "username",
    "walletAddress": "0x1234..."
  }'
```

---

#### GET /api/wallet/:githubId

Get wallet address for a GitHub user.

**Parameters:**

- `githubId` (path) - GitHub user ID (integer)

**Response:**

```json
{
  "id": 1,
  "github_id": 12345,
  "github_username": "username",
  "wallet_address": "0x...",
  "verified_at": 1704067200,
  "created_at": 1704067200
}
```

**Errors:**

- `404` - Wallet not found

**Example:**

```bash
curl https://your-domain.com/api/wallet/12345
```

---

### OAuth

#### GET /oauth/github

Initiate GitHub OAuth flow.

**Query Parameters:**

- `returnTo` (optional) - URL to redirect to after OAuth

**Response:**
Redirects to GitHub OAuth page.

**Example:**

```plaintext
https://your-domain.com/oauth/github?returnTo=/link-wallet
```

---

#### GET /oauth/callback

GitHub OAuth callback endpoint. Handled automatically by GitHub redirect.

**Query Parameters:**

- `code` - Authorization code from GitHub
- `state` - CSRF protection token

**Response:**
Redirects to return URL or `/link-wallet`.

---

#### GET /oauth/user

Get current authenticated GitHub user.

**Response:**

```json
{
  "githubId": 12345,
  "githubUsername": "username"
}
```

**Errors:**

- `401` - Not authenticated

**Example:**

```bash
curl https://your-domain.com/oauth/user
```

---

#### POST /oauth/logout

Logout and clear session.

**Response:**

```json
{
  "success": true
}
```

**Example:**

```bash
curl -X POST https://your-domain.com/oauth/logout
```

---

### Webhooks

#### POST /webhooks/github

GitHub webhook endpoint. Receives events from GitHub.

**Headers:**

- `X-Hub-Signature-256` - HMAC signature
- `X-Github-Event` - Event type
- `X-Github-Delivery` - Delivery ID

**Request Body:**
GitHub webhook payload (varies by event type).

**Response:**

```json
{
  "success": true
}
```

**Errors:**

- `401` - Invalid signature
- `500` - Processing failed

**Note:** This endpoint is called by GitHub automatically. Manual testing requires proper signature verification.

---

### Health Check

#### GET /health

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "ok",
  "service": "bountypay-github-app",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Example:**

```bash
curl https://your-domain.com/health
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

**Common Status Codes:**

- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (authentication required)
- `404` - Not found
- `500` - Internal server error

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

---

## CORS

CORS is configured to allow requests from `FRONTEND_URL`. Ensure the frontend URL matches your deployment.

---

## Session Management

Sessions are stored in httpOnly cookies with:

- `secure: true` (HTTPS only in production)
- `sameSite: 'lax'`
- `maxAge: 24 hours`

---

## Examples

### Complete Wallet Linking Flow

```javascript
// 1. Get nonce
const nonceRes = await fetch('/api/nonce');
const { nonce } = await nonceRes.json();

// 2. Create SIWE message and sign
const message = createSIWEMessage(nonce, walletAddress);
const signature = await wallet.signMessage(message);

// 3. Verify wallet
const verifyRes = await fetch('/api/verify-wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, signature })
});

// 4. Link GitHub (after OAuth)
const linkRes = await fetch('/api/wallet/link', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    githubId: 12345,
    githubUsername: 'username',
    walletAddress: walletAddress
  })
});
```

### Complete Bounty Creation Flow

```javascript
// 1. Create bounty on contract (from frontend)
const tx = await escrowContract.createBounty(
  resolverAddress,
  repoIdHash,
  issueNumber,
  deadline,
  amount
);
await tx.wait();

// 2. Notify backend
const createRes = await fetch('/api/bounty/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repoFullName: 'owner/repo',
    repoId: 123456789,
    issueNumber: 42,
    sponsorAddress: walletAddress,
    amount: amount.toString(),
    deadline: Math.floor(deadlineDate.getTime() / 1000),
    txHash: tx.hash,
    installationId: 12345678
  })
});
```

---

## Next Steps

- [Architecture](architecture.md) - System design overview
- [Smart Contracts](smart-contracts.md) - Contract integration
- [Troubleshooting](troubleshooting.md) - Common issues
