# Database Reference (Visual)

> Prisma schema: `shared/server/db/schema.prisma`  
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
    string status            "open|resolved|refunded|canceled"
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

## Usage Notes

- `CONFIG.envTarget` is written to `Bounty.environment`; always filter queries by it.  
- Prefer helpers in `shared/server/db/prisma.js` for:
  - BigInt conversions (`repoId`, etc.).
  - Optional issue metadata detection.
- Links by `bountyId` (`PrClaim`, `Allowlist`) are enforced in application logic, not DB FKs.
