# Architecture

## System Overview
- **Frontend:** Next.js 15 App Router renders all user interfaces under `app/`, backed by shared context (`shared/components/Providers`, `shared/components/NetworkProvider`) and a minimal design system rooted in `app/globals.css`.
- **Backend:** Next.js API routes in `app/(api)/api/*` act as the HTTP edge. Each handler delegates logic to reusable modules in `shared/server/` (auth, blockchain, GitHub, database, notifications).
- **Persistence:** Prisma (`prisma/schema.prisma`) targets Postgres and is accessed exclusively through query helpers in `shared/server/db/prisma.js`.
- **Smart contracts:** A single `BountyEscrow` contract (`contracts/current/BountyEscrow.sol`) custodians funds per GitHub issue across Base and Mezo networks defined in `config/chain-registry.js`.
- **Integrations:** A GitHub App (via `shared/server/github/*`) drives installations, issue comments, and webhook automation, while Resend powers alert emails.

## Component Map

### Frontend (Next.js App Router)
- Global structure (`app/layout.jsx`) wraps every page with wallet/network providers, the shared `Navbar`, and `Footer`.
- `shared/components/Providers.jsx` boots wagmi, RainbowKit, and TanStack Query. Chains are limited to Base Sepolia and Mezo Testnet, matching the registry defaults.
- `shared/components/NetworkProvider.jsx` fetches `/api/registry`, persists the preferred env in the `network_env` cookie through `/api/network/env`, and exposes `useNetwork` helpers so pages can render the correct token metadata and RPC hints.
- Main routes:
  - `app/(public)/page.jsx`: public bounty board backed by `/api/bounties/open` (or `shared/data/bounties.js` when `NEXT_PUBLIC_USE_DUMMY_DATA=true`).
  - `app/(public)/attach-bounty/page.jsx`: post-GitHub-App funding wizard that prepares contract parameters before calling `/api/bounty/create`.
  - `app/(authenticated)/account/page.jsx`: combined sponsor + contributor hub with tabs (Sponsored, Earnings, Settings, optional Admin) driven by `?tab=` deep links.
  - `app/(authenticated)/account/bounty/[bountyId]/page.jsx`: sponsor-only detail view for allowlists and bounty status controls.
  - `app/(authenticated)/link-wallet/page.jsx`: GitHub OAuth + SIWE + `/api/wallet/link` client flow.
  - `app/(authenticated)/refund/page.jsx`: sponsor refund utility.
- Shared UI (cards, modals, avatars, icon set) lives in `shared/components/` and keeps the color tokens (primary `#00827B`, secondary `#39BEB7`, tertiary `#83EEE8`) consistent.

### API Edge Layer
- Each handler in `app/(api)/api/*/route.js` is thin: validate inputs, call server helpers, respond with JSON.
- Groups:
  - **Auth & sessions:** `/api/nonce`, `/api/verify-wallet`, `/api/oauth/*`, `/api/oauth/logout`.
  - **Wallets:** `/api/wallet/link`, `/api/wallet/:githubId`, `/api/wallet/delete`.
  - **Bounties & allowlists:** `/api/bounty/create`, `/api/bounty/[id]`, `/api/bounties/open`, `/api/issue/[repoId]/[issueNumber]`, `/api/allowlist/[bountyId]`.
  - **Dashboards:** `/api/user/profile`, `/api/user/bounties`, `/api/user/claimed-bounties`, `/api/user/stats`.
  - **GitHub plumbing:** `/api/github/installations`, `/api/github/callback`, `/api/webhooks/github`.
  - **Network/config:** `/api/registry`, `/api/network/env`, `/api/network/default`, `/api/resolver`, `/api/tokens`.
  - **System:** `/api/stats`, `/api/health`.
- API routes execute in the Next.js runtime (edge or Node depending on the handler). Heavy work is pushed into `shared/server/` so routes stay declarative and testable.

### Server Modules
| Path | Responsibility |
| --- | --- |
| `shared/server/config.js` | Loads env vars, builds wallet map per network alias, exposes token metadata, and validates required configuration. |
| `shared/server/auth/siwe.js` | Generates nonces and constructs/verifies SIWE messages against the configured domain. |
| `shared/server/db/prisma.js` | Initializes Prisma and exports query objects for bounties, wallets, PR claims, users, stats, and allowlists. |
| `shared/server/blockchain/contract.js` | Wraps ethers.js providers, network registry lookups, bounty ID computation, payout execution, and token helpers. |
| `shared/server/github/client.js` | Boots the GitHub App via `octokit`, returning installation-scoped clients plus helpers for comments and labels. |
| `shared/server/github/webhooks.js` | Central dispatcher for `issues`, `pull_request`, and `ping` events: posts CTA buttons, records PR claims, triggers `resolveBountyOnNetwork`, and escalates failures via comments + email. |
| `shared/server/notifications/email.js` | Sends alert emails through Resend (no-op when credentials are missing). |

### Database Layer
- Prisma models: `Bounty`, `WalletMapping`, `PrClaim`, `User`, `Allowlist`, `NotificationPreference`. Each table mirrors the schema documented in `docs/reference/database.md`.
- `shared/server/db/prisma.bountyQueries` enforces derived fields such as `environment` (from `CONFIG.envTarget`) and BigInt conversions before returning plain JS objects.
- Read/write patterns keep API handlers simple: they import the query namespace they need and never access Prisma directly.

### Blockchain + Network Registry
- `config/chain-registry.js` centralizes supported aliases (Base Mainnet/Sepolia, Mezo Mainnet/Testnet). It enforces RPC/token/contract env vars at load time and surfaces utilities (`REGISTRY`, `getDefaultAliasForGroup`, `getAlias`).
- `contracts/current/BountyEscrow.sol` (Solidity 0.8.24) escrows ERC‑20 funds, enforces resolver-only payouts, supports sponsor refunds after deadlines, and accrues protocol fees. It imports OpenZeppelin 5.0.2 libraries (installed via npm in `node_modules/@openzeppelin/contracts`).
- `shared/server/blockchain/contract.js` creates per-alias clients with ethers v6, computes bounty IDs, formats/parse token amounts, and handles resolver wallet selection. It also handles non-1559 networks (Mezo) by sending legacy gas parameters.
- The frontend pulls the registry via `/api/registry` and stores per-user env choice via `/api/network/env`, so both wagmi and server-side logic agree on the active chain ID/token metadata.

### GitHub Integration
- The GitHub App manifest lives in `github-app-manifest.json`. Runtime credentials are loaded in `shared/server/config.js`.
- `/api/webhooks/github` verifies `x-hub-signature-256`, parses the raw payload, and delegates to `handleWebhook`.
- Key webhook behaviors:
  - `issues.opened`: posts a branded “Create bounty” CTA with `public/buttons/create-bounty.svg`.
  - `pull_request.opened/edited`: matches referenced issues against open bounties; records entries in `pr_claims` and nudges contributors to link wallets if needed.
  - `pull_request.closed` (merged): looks up wallet mappings, executes on-chain `resolve`, updates the DB, and rewrites the pinned bounty comment with payout details.
- Errors during automation emit maintainer comments and optional alert emails (Resend) so sponsors can manually intervene.

## Core Flows

### Bounty Creation
1. Sponsor installs the GitHub App and follows the `/attach-bounty` wizard.
2. Frontend collects repo metadata, contract arguments, and calls `/api/bounty/create`.
3. The route reads the user’s selected alias via `getActiveAliasFromCookies`, computes the bounty ID with `computeBountyIdOnNetwork`, writes the record via `bountyQueries.create`, then triggers `handleBountyCreated` to post/pin the bounty summary comment and add labels.
4. On-chain funding happens directly in the user’s wallet (RainbowKit/wagmi), leveraging the contract addresses from the registry.

### Wallet Linking & Claims
1. `/link-wallet` drives GitHub OAuth (`/api/oauth/github`) and wallet connection (RainbowKit).
2. The client fetches `/api/nonce`, prompts the user to sign a SIWE message, posts it to `/api/verify-wallet`, then persists the GitHub ↔ wallet association via `/api/wallet/link`.
3. When a PR references a bounty, `handlePRWithBounties` records a `pr_claims` row and comments on the PR with the claim status (including wallet prompts if needed).

### Automatic Payout
1. GitHub sends a `pull_request.closed` webhook marked `merged`.
2. `handlePullRequestMerged` loads all `pr_claims` for that PR, fetches the contributor’s wallet, and calls `resolveBountyOnNetwork`.
3. Success path: `bountyQueries.updateStatus(..., 'resolved')`, `prClaimQueries.updateStatus(..., 'paid')`, success comments in both the PR and issue, and a refreshed pinned bounty summary with transaction links.
4. Failure path: posts troubleshooting guidance, flags the claim as `failed`, and (for critical cases) emails + comments to maintainers.

### Refunds & Allowlist Management
- Sponsors can switch to `/account/bounty/[bountyId]` to manage bounty-specific or repo-level allowlists (`shared/server/db/allowlistQueries`) which gate who can claim payouts.
- `/refund` surfaces the `refundExpired` contract method so sponsors can claw back funds after deadlines. Refund events are recorded in the `bounties` table via `updateStatus`.

## Configuration & Environments
- Environment variables drive everything (`env.txt` documents defaults). `shared/server/config.validateConfig()` ensures essentials (session secret, GitHub keys, wallet keys, registry defaults) exist at boot.
- Network aliases are toggled per user via the `network_env` cookie and persisted server-side using `/api/network/env`.
- Sessions rely on `iron-session` (`shared/lib/session`), scoped to the domain derived from `FRONTEND_URL`, and marked secure in production.
- `NEXT_PUBLIC_*` vars configure wallets (WalletConnect project ID), dummy data, and local/testnet toggles.

## Observability & Safety
- SIWE signatures (`shared/server/auth/siwe.js`) ensure wallet ownership before linking.
- GitHub webhooks are HMAC-verified, and sensitive endpoints (allowlists, dashboard APIs) require an active GitHub session.
- `shared/server/blockchain/validation.js` normalizes addresses, bytes32 IDs, and transaction hashes before any on-chain call.
- Alerting: webhook failures, unpaid claims, DB sync issues, and payout errors all generate GitHub comments and optionally Resend emails so the team can react quickly.
- Security-sensitive secrets (GitHub private key, resolver private keys) are never bundled at build time; `shared/server/config.js` lazy-loads them from file paths or env vars.

## Repository Layout & Tooling
- `app/`: Next.js routes (UI + API).
- `shared/components/`: shared UI and context providers aligned with the accent palette.
- `shared/server/`: backend helpers described above.
- `features/`: domain-specific modules (account, wallet, beta-access, bounty) shared across routes.
- `config/`: chain registry and supporting utilities.
- `contracts/` & `script/`: Solidity sources plus Foundry scripts (e.g., `script/DeployBountyEscrow.s.sol`).
- `prisma/`: schema + migrations (run `npx prisma migrate dev` for local changes).
- `docs/`: guides and references (this file plus API/server/frontend/database/contract references).
- `public/`: static assets (logo `public/icons/og.png`, CTA buttons, stats HTML).
- `shared/data/`: mocked responses for UI development.
- `shared/lib/`: runtime helpers (session, network env, flags, logger) for both UI and API routes, while `lib/` continues to host vendored Solidity deps.
- Tooling scripts (per `package.json`): `npm run dev` (Next dev server), `npm run build` (Prisma generate + Next build), `npm run test` (Node test runner placeholder).

## Related Documentation
- `docs/reference/frontend.md`: route-by-route UI details.
- `docs/reference/api.md`: endpoint-by-endpoint request/response overview.
- `docs/reference/server.md`: deep dive into `shared/server/` modules.
- `docs/reference/database.md`: tables and relationships.
- `docs/reference/contracts.md`: deployed addresses per network.
- `docs/guides/getting-started.md`: sponsor + contributor walkthroughs.
