# API Reference

Base path: `/api/*`. All routes are in `app/api/`. Responses are JSON with either `{ success, ... }` or `{ error }`. Sessions are managed by `iron-session` (see `lib/session`); GitHub OAuth populates `githubId`/`githubUsername`, and SIWE verification stores `walletAddress`/`chainId`.

## Auth & identity
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/nonce` | None | Issues a SIWE nonce and saves it in the session. |
| POST | `/api/siwe/message` | None | Builds a SIWE message string from `{ address, nonce, chainId?, domain?, uri?, statement?, resources? }`. |
| POST | `/api/verify-wallet` | None | Verifies SIWE signature, stores `walletAddress` + `chainId` in the session. |
| GET | `/api/oauth/github` | None | Redirects to GitHub OAuth (optional `returnTo`). |
| GET | `/api/oauth/callback` | None | Exchanges the code, stores GitHub identity/token in session, then redirects. |
| GET | `/api/oauth/user` | Session | Returns `{ githubId, githubUsername }` or 401. |
| POST | `/api/oauth/logout` | Session | Destroys the current session. |
| GET | `/api/admin/check` | Session | Returns `{ isAdmin }` based on `ADMIN_GITHUB_IDS`. |
| GET | `/api/admin/fees` | Admin session | Returns protocol fee balances for all configured networks. |

## Wallets
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/wallet/link` | Wallet session | Body `{ githubId, githubUsername, walletAddress }`; requires the session wallet to match. |
| GET | `/api/wallet/[githubId]` | None | Public lookup of a wallet mapping. |
| DELETE | `/api/wallet/delete` | GitHub session | Body `{ confirmation: 'i want to remove my wallet' }`; deletes the caller’s mapping. |

## Bounties & allowlists
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/bounty/create` | Optional GitHub session | Persists bounty metadata (repo, issue, funding tx, network alias). Also tries to post a GitHub comment. |
| GET | `/api/bounty/[bountyId]` | None | Reads bounty metadata from Postgres. |
| GET | `/api/bounties/open` | None | Lists all open bounties in the current environment. |
| GET | `/api/issue/[repoId]/[issueNumber]` | None | Lists open bounties for a GitHub issue. |
| GET | `/api/contract/bounty/[bountyId]` | None | Reads on-chain bounty state using the stored network alias. |
| GET | `/api/allowlist/[bountyId]` | GitHub session | Sponsor-only allowlist read. |
| POST | `/api/allowlist/[bountyId]` | GitHub session | Sponsor-only add `{ address }` (auto-creates user). |
| DELETE | `/api/allowlist/[bountyId]` | GitHub session | Sponsor-only delete `{ allowlistId }`. |

## Refunds
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/refunds/request` | GitHub session | Custodial refund path. Body `{ bountyId }`. Requires the caller to own the bounty (by GitHub ID), checks expiry, and submits `refundExpired` using the configured custody wallet for the bounty’s network. |

## User dashboards
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/user/profile` | GitHub session | Returns user profile plus wallet mapping (creates a stub if missing). |
| POST | `/api/user/profile` | GitHub session | Persists `preferences` JSON. |
| GET | `/api/user/bounties` | GitHub session | Sponsored bounties for the caller. |
| GET | `/api/user/claimed-bounties` | GitHub session | PR claims created by the caller. |
| GET | `/api/user/stats` | GitHub session | Counts and aggregates for the caller’s sponsored bounties. |

## Beta program
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/beta/check` | Session | Returns beta access status (admins auto-approved). |
| POST | `/api/beta/apply` | GitHub session | Creates a pending beta application. |
| GET | `/api/beta/applications` | Admin session | Lists pending/approved/rejected applications. |
| POST | `/api/beta/review` | Admin session | Body `{ githubId, status, reason? }` to approve/reject. |
| POST | `/api/beta/notify` | Admin session | Sends a Resend email notification (best-effort). |

## GitHub integration
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/github/installations` | GitHub session | Lists repos accessible via the GitHub App for the caller. |
| POST | `/api/github/callback` | GitHub App | Proxies raw callbacks to the configured upstream URL (keeps headers/body). |
| POST | `/api/webhooks/github` | GitHub App | Verifies signature and dispatches to webhook handlers. |

## Network & config
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/registry` | None | Full network registry from `shared/config/chain-registry`. |
| GET | `/api/network/env` | Cookie | Reads `network_env` cookie (`testnet` default). |
| POST | `/api/network/env` | Cookie | Writes `network_env` cookie (`mainnet` or `testnet`) if configured. |
| GET | `/api/network/default` | None | Returns the default alias for `group=testnet|mainnet`. |
| GET | `/api/resolver?network=ALIAS` | None | Returns the resolver/owner wallet for an alias. |
| GET | `/api/tokens` | None | Token metadata map derived from the registry. |

## Stats & system
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/stats` | None | Token-level stats, recent bounties, and overall aggregates. |
| GET | `/api/health` | None | Simple health probe. |

## Errors
Errors are returned as `{ error: string }` with an appropriate HTTP status. Check the status code for context.
