# API Folder Reference

Base path: `/api/*`. Every handler here returns JSON (`{ data }` or `{ error }`). Keep requests simple—most endpoints only expect a handful of fields and respond with standard HTTP status codes.

## Authentication & Sessions

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/nonce` | None | Issue a SIWE nonce and stash it in the session. |
| POST | `/api/verify-wallet` | SIWE signature | Verify the signed message and store `walletAddress` + `chainId` in the session. |
| GET | `/api/oauth/github` | None | Redirect the user to GitHub OAuth (optional `returnTo` query). |
| GET | `/api/oauth/callback` | GitHub code | Finalize GitHub OAuth, persist profile data, then redirect. |
| GET | `/api/oauth/user` | GitHub session | Return the active GitHub identity from the session. |
| POST | `/api/oauth/logout` | Session cookie | Destroy the current session and clear cookies. |

## Wallets

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/wallet/link` | GitHub + SIWE session | Store a GitHub ↔ wallet mapping after confirming the session wallet. |
| GET | `/api/wallet/:githubId` | None | Public lookup for a contributor's wallet record. |
| DELETE | `/api/wallet/delete` | GitHub session | Remove the caller's wallet record (requires confirmation phrase). |

## Bounties & Allowlists

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/bounty/create` | Optional GitHub session | Persist an on-chain bounty (repo, issue, token, tx hash) and kick off GitHub comments. |
| GET | `/api/bounty/:bountyId` | None | Fetch bounty metadata from the database. |
| GET | `/api/bounties/open` | None | List every bounty still marked `open`. |
| GET | `/api/issue/:repoId/:issueNumber` | None | List bounties tied to a specific GitHub issue. |
| GET | `/api/contract/bounty/:bountyId` | None | Pull live on-chain data for the bounty using its stored network alias. |
| GET | `/api/allowlist/:bountyId` | Sponsor session | Return addresses cleared to claim the bounty. |
| POST | `/api/allowlist/:bountyId` | Sponsor session | Add a validated address to the allowlist (auto-creates sponsor record if needed). |
| DELETE | `/api/allowlist/:bountyId` | Sponsor session | Remove an allowlist entry by `allowlistId`. |

## User Dashboards

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/user/profile` | GitHub session | Return the user's profile plus wallet info (creates a stub if missing). |
| POST | `/api/user/profile` | GitHub session | Update stored user preferences. |
| GET | `/api/user/bounties` | GitHub session | List sponsored bounties with basic expiry stats. |
| GET | `/api/user/claimed-bounties` | GitHub session | Show PR claims filed by the user, including payout metadata. |
| GET | `/api/user/stats` | GitHub session | Aggregate counts for open/resolved/refunded bounties and value totals. |

## GitHub App & Webhooks

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/github/installations` | GitHub session | List repositories the logged-in user can access via the GitHub App. |
| POST | `/api/github/callback` | GitHub App | Proxy callback payloads to the configured upstream URL without modifying headers/body. |
| POST | `/api/webhooks/github` | GitHub App | Verify `x-hub-signature-256` and hand events to the webhook dispatcher. |

## Network & Config

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/network/env` | Session cookie | Read the stored network group (`testnet` default). |
| POST | `/api/network/env` | Session cookie | Store the desired network group (`mainnet` or `testnet`) in a long-lived cookie. |
| GET | `/api/network/default` | None | Return the default registry alias for `group=mainnet|testnet`. |
| GET | `/api/registry` | None | Dump the full `REGISTRY` configuration for clients. |
| GET | `/api/resolver?network=alias` | None | Resolve the owner wallet address for a given network alias. |
| GET | `/api/tokens` | None | Expose the configured token metadata map. |

## Stats & System

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/stats` | None | Aggregate recent activity plus per-token and overall metrics. |
| GET | `/api/health` | None | Simple health probe with status, version, and timestamp. |

## Error Shape

Errors follow a single pattern:

```json
{ "error": "message" }
```

Check the HTTP status code for context.

