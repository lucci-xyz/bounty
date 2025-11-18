# Database Schema Reference

The Prisma schema (`prisma/schema.prisma`) maps to a Postgres database. Use `npx prisma migrate dev` to apply changes locally and `npx prisma generate` whenever the schema changes so the client stays in sync.

## Models

### Bounty (`bounties`)
- Tracks every on-chain bounty the app is aware of.
- Key fields: `bountyId` (bytes32 hex, unique), `repoFullName`, `repoId`, `issueNumber`, sponsor GitHub/chain data, `token`, `amount`, `deadline`, `status`, `txHash`, `network`, `chainId`, `tokenSymbol`, `environment`.
- Important constraints:
  - `@@unique([repoId, issueNumber, sponsorAddress, network, environment])` prevents duplicate funding of the same issue per sponsor + network + env.
  - Multiple indexes speed up lookups by repo, status, token, and environment.

### WalletMapping (`wallet_mappings`)
- Maps a GitHub account to a verified wallet address (`walletAddress`, `verifiedAt`).
- `githubId` is unique so one GitHub account can only point to one wallet at a time.

### PrClaim (`pr_claims`)
- Represents contributor pull-request claims for a bounty.
- Core fields: `bountyId`, `prNumber`, `prAuthorGithubId`, `status` (default `pending`), optional `resolvedAt` + payout `txHash`.
- Indexed on `bountyId` for quick lookups when resolving payments.

### User (`users`)
- Stores GitHub profile basics plus arbitrary `preferences` JSON.
- Links to `Allowlist` records via the `allowlists` relation (cascade delete).
- `githubId` is unique to mirror GitHub’s user id.

### Allowlist (`allowlists`)
- Optional guardrails for who can claim a bounty or repo-level bounty.
- Fields: `userId` (FK to `users`), optional `bountyId` or `repoId`, `allowedAddress`.
- Indexed on `userId`, `bountyId`, and `repoId` for filtering from the dashboard.

### NotificationPreference (`notification_preferences`)
- Per-user notification toggles (`emailOnClaim`, `emailOnMerge`, `emailOnExpiry`).
- `userId` is unique so each user has at most one preference row.

## Relationships
- `User` ↔ `Allowlist`: one-to-many (cascade delete when a user disappears).
- `Bounty` ties to claims via `PrClaim.bountyId` (handled at the application layer).
- Wallets and notification preferences reference `User` by `githubId`/`userId` but remain separate tables for simplicity.

Keep migrations focused on evolving these models. If you introduce a new relation, update both this file and the schema comments so future contributors understand the data flow.

