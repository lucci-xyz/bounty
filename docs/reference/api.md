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
| POST | `/api/wallet/link` | GitHub + wallet session | Takes **no body**. Links the SIWE-verified wallet in the session to the OAuth-verified GitHub identity in the session. Any request body is ignored — accepting a caller-supplied `githubId` previously allowed overwriting another user's wallet mapping and stealing their payouts. |
| GET | `/api/wallet/[githubId]` | GitHub session (own ID only) | Returns the caller's own wallet mapping; 403 for any other `githubId`. Formerly unauthenticated, which made it a public GitHub-ID → wallet-address oracle. Has no callers in the app. |
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
| POST | `/api/refunds/confirm` | GitHub session | Records a sponsor-signed refund after the wallet has broadcast `refundExpired` itself. Body `{ bountyId, txHash }`. |

## Payouts
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/payout/retry` | GitHub session | **Moves funds.** Body `{ claimId }`. Retries a `failed` claim for the authenticated contributor. Requires the claim's `prAuthorGithubId` to equal the session GitHub ID, the claim to be `failed`, and the bounty to be `open` and in the current `ENV_TARGET`. Pays the wallet mapped to the session identity — never an address from the request. |

## User dashboards
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/user/profile` | GitHub session | Returns user profile plus wallet mapping (creates a stub if missing). |
| POST | `/api/user/profile` | GitHub session | Persists `preferences` JSON. |
| GET | `/api/user/bounties` | GitHub session | Sponsored bounties for the caller. |
| GET | `/api/user/claimed-bounties` | GitHub session | PR claims created by the caller. |
| GET | `/api/user/stats` | GitHub session | Counts and aggregates for the caller’s sponsored bounties. |
| POST | `/api/user/email` | GitHub session | Sets the caller’s notification email and sends a verification link. |
| GET | `/api/user/email/verify` | Signed token | Confirms an email address from the link sent by `/api/user/email`. Authenticated by the token in the URL, not by session. |

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
| POST | `/api/webhooks/github` | `X-Hub-Signature-256` | **Triggers payouts.** Verifies the HMAC signature via `integrations/github/webhookAuth.js` and rejects with 401 before parsing the body. Note that Octokit's `webhooks.verify()` *returns* a boolean rather than throwing, so its result must be checked — awaiting it alone accepts every forged request. |
| POST | `/api/webhooks/discord/bounty-created` | `Bearer $DISCORD_RELAY_SECRET` | Relays a bounty announcement to Discord. **Fails closed** when the secret is unset. Redundant: `/api/bounty/create` already calls `sendNewBountyNotification` server-side, and this route has no callers. |
| POST | `/api/webhooks/marketplace` | GitHub Marketplace | Receives `marketplace_purchase` events (plan changes). Verifies `X-Hub-Signature-256` using `GITHUB_MARKETPLACE_WEBHOOK_SECRET`. Logs actions: `purchased`, `changed`, `cancelled`, `pending_change`, `pending_change_cancelled`. |

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
| GET | `/api/cron/expiration-notify` | `Bearer $CRON_SECRET` | Emails sponsors of bounties nearing expiry. Invoked by the Vercel cron in `vercel.json`. **Fails closed**: returns 503 when `CRON_SECRET` is unset, so it can never be triggered anonymously as a mailing cannon. |
| POST | `/api/admin/test-email` | Admin session | Sends a template email to the admin for visual checks. |

## Errors
Errors are returned as `{ error: string }` with an appropriate HTTP status. Check the status code for context.
