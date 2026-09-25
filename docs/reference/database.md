# Database Reference (Visual)

> Prisma schema: `server/db/schema.prisma`  
> Migrate: `npx prisma migrate dev`  
> Generate client: `npx prisma generate`

---

## ER Diagram

```mermaid
erDiagram
  Bounty {
    string bountyId        "PK (bytes32 hex, unique)"
    string repoFullName
    bigint repoId
    int    issueNumber
    string issueTitle?       "optional"
    string issueDescription? "optional"
    string sponsorAddress
    string sponsorGithubId?  "optional"
    string token             "ERC-20 address"
    string amount            "raw units (string)"
    int    deadline          "unix seconds"
    string status            "open|resolved|refunded"
    string txHash?           "optional"
    string network           "alias"
    int    chainId
    string tokenSymbol
    string environment       "stage|prod"
    int    pinnedCommentId?  "optional"
    DateTime createdAt
    DateTime updatedAt
  }

  WalletMapping {
    string githubId        "unique"
    string githubUsername
    string walletAddress
    DateTime verifiedAt
    DateTime createdAt
  }

  PrClaim {
    int    id              "PK"
    string bountyId        "logical FK → Bounty"
    int    prNumber
    string prAuthorGithubId
    string repoFullName
    string status          "pending|paid|failed"
    string txHash?         "optional"
    DateTime createdAt
    DateTime resolvedAt?   "optional"
  }

  User {
    int    id              "PK"
    string githubId        "unique"
    string githubUsername
    string email?          "optional"
    string avatarUrl?      "optional"
    json   preferences?    "optional"
    DateTime createdAt
    DateTime updatedAt
  }

  Allowlist {
    int    id              "PK"
    int    userId          "FK → User.id"
    string bountyId?       "logical link → Bounty"
    bigint repoId?         "optional"
    string allowedAddress
    DateTime createdAt
  }

  NotificationPreference {
    int    id              "PK"
    int    userId          "unique FK → User.id"
    bool   emailOnClaim
    bool   emailOnMerge
    bool   emailOnExpiry
    DateTime createdAt
    DateTime updatedAt
  }

  BetaAccess {
    int    id              "PK"
    string githubId        "unique"
    string githubUsername
    string email?          "optional"
    string status          "pending|approved|rejected"
    DateTime appliedAt
    DateTime reviewedAt?   "optional"
    string reviewedBy?     "optional"
  }

  %% Relationships (DB-level + app-level)

  User ||--o{ Allowlist : "userId"
  User ||--|| NotificationPreference : "userId (1:1)"

  Bounty ||--o{ PrClaim : "bountyId [app-level]"
  Bounty ||--o{ Allowlist : "bountyId [app-level]"

  User ||--o{ Bounty : "via sponsorGithubId [app-level]"
  User ||--o{ BetaAccess : "via githubId [app-level]"
  User ||--o{ WalletMapping : "via githubId [app-level]"
```

---

## Model Cheat Sheet

| Model                    | Table                     | Key identifier(s)                                                                      | Main role                                      |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Bounty`                 | `bounties`                | `bountyId` (bytes32 hex, unique), `@@unique([repoId, issueNumber, sponsorAddress, network, environment])` | Core bounty + on-chain + env metadata         |
| `WalletMapping`          | `wallet_mappings`         | `githubId` (unique)                                                                    | GitHub → wallet address mapping               |
| `PrClaim`                | `pr_claims`               | `id` (PK), `bountyId`                                                                  | PR-level claims against a bounty              |
| `User`                   | `users`                   | `id` (PK), `githubId` (unique)                                                         | GitHub user profile for the app               |
| `Allowlist`              | `allowlists`              | `id` (PK), `userId` (FK → `users.id`)                                                  | Address-level allowlists per user/bounty/repo |
| `NotificationPreference` | `notification_preferences`| `id` (PK), `userId` (unique FK)                                                        | Email notification toggles                    |
| `BetaAccess`             | `beta_access`             | `id` (PK), `githubId` (unique)                                                         | Beta access pipeline                          |

---

## Status Values

### Bounty Status (follows contract standard, centralized in `lib/status/index.js`)

| Status | Contract Enum | Description |
|--------|---------------|-------------|
| `open` | 1 | Bounty is active, awaiting PR merge or expiry |
| `resolved` | 2 | Bounty paid to contributor |
| `refunded` | 3 | Bounty refunded to sponsor after deadline passed |

Contract enum `0` = `None` (bounty doesn't exist, never returned to UI). There is no `cancel` function in the new contract; sponsors can only refund after the deadline passes.

### Lifecycle States

The `lifecycle.state` field adds one additional state for open bounties:
- `expired` — status is `open` but deadline has passed (eligible for refund)

### PrClaim Status

| Status | Description |
|--------|-------------|
| `pending` | PR opened, awaiting merge. Only the merge webhook may settle it. |
| `pending_wallet` | PR merged and closes the issue, but no wallet was linked. Paid automatically when the contributor links one, or from the dashboard. |
| `failed` | PR merged and closes the issue, but the transfer did not happen. The contributor can retry; re-linking a wallet also retries. |
| `paid` | Funds transferred. Terminal: `prClaimQueries.updateStatus` never moves a claim out of it. |

Every settlement goes through `server/payouts/settleClaim.js`; `lib/claimStatus.js` holds the status sets and dashboard labels.

`mergeVerifiedAt` is set only by the merge webhook, after it checks that the merged PR closes the bountied issue. Settlement refuses any claim without it, whatever the status: before commit `164a98f` the webhook wrote `pending_wallet` and `failed` without that check. Rows from before migration `20260925120000_pr_claims_merge_verified` stay unpayable until an operator confirms each one; the migration file has the queries.

Run `npm run test:integration` against a disposable local Postgres (`TEST_DATABASE_URL`, database name containing `test`) to exercise these queries; CI runs it on every push.

---

## Usage Notes

- `CONFIG.envTarget` is written to `Bounty.environment`; always filter queries by it.  
- Prefer helpers in `server/db/prisma.js` for:
  - BigInt conversions (`repoId`, etc.).
  - Optional issue metadata detection.
  - Status validation (rejects invalid status values).
- Links by `bountyId` (`PrClaim`, `Allowlist`) are enforced in application logic, not DB FKs.
- Use `lib/status` for status constants and helpers, never hardcode status strings.
