# Server Layer

This directory contains all backend helpers used by the Next.js API routes. The runtime is still Next.js, but we keep the heavier lifting here to keep the route files small.

## Structure

| Folder | Purpose |
| --- | --- |
| `auth/` | SIWE helpers, cookie/session utilities, and other authentication glue. |
| `blockchain/` | On-chain helpers such as `contract.js` (read/write to the escrow contract) and validation helpers for chain inputs. |
| `config.js` | Central configuration loader: reads env vars, GitHub app credentials, blockchain wallet map, token metadata, etc. Everything else imports from here. |
| `db/` | Prisma query wrappers grouped by concern (bounties, users, wallets, stats, allowlists, PR claims). API routes import from here instead of calling Prisma directly. |
| `github/` | GitHub App client bootstrap plus webhook handlers (`client.js`, `webhooks.js`). Handles installations, comments, and issue updates. |
| `notifications/` | Email/SaaS notification helpers. Currently houses `email.js` for transactional alerts. |

## Typical Flow

1. Next.js route receives the request (`app/api/...`).
2. Route imports the relevant query or helper from `server/*`.
3. Helpers read configuration from `server/config.js`, talk to Prisma, GitHub, or the blockchain, then return plain objects.

Keep new server-side modules colocated under this folder and expose only what the routes need. This keeps the backend logic testable without going through HTTP.

