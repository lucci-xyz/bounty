# Agent Guide: BountyPay Development

This guide helps AI coding agents understand the BountyPay project structure, conventions, and how to effectively contribute code.

## Project Overview

BountyPay is a Next.js application that automates bounty payments for GitHub issues. Sponsors fund bounties with USDC (Base) or MUSD (Mezo), and contributors are automatically paid when their PRs are merged and close the issue.

**Key Technologies:**
- **Framework**: Next.js 15 (App Router)
- **Hosting**: Vercel (serverless functions, edge runtime)
- **Database**: PostgreSQL with Prisma ORM (Vercel Postgres)
- **Blockchain**: ethers.js v6, wagmi, RainbowKit
- **Auth**: GitHub OAuth + SIWE (Sign-In with Ethereum)
- **Styling**: Tailwind CSS v4
- **Contracts**: Solidity (Foundry)

## Project Structure

```
app/                          # Next.js App Router (pages + API)
├── page.jsx                  # Landing page
├── layout.jsx                # Root layout
├── api/                      # API routes (REST endpoints)
│   ├── bounty/               # Bounty CRUD operations
│   ├── refunds/              # Refund processing
│   ├── user/                 # User dashboard data
│   ├── webhooks/github/      # GitHub webhook handler
│   └── ...                   # Other API routes
├── app/                      # App pages at /app/*
│   ├── account/              # Dashboard (tabs: Sponsored, Earnings, Settings, Controls)
│   ├── attach-bounty/        # Post-GitHub-App funding flow
│   └── link-wallet/          # GitHub + wallet linking flow
├── admin/                    # Admin-only pages
│   └── beta/                 # Beta access management
└── base-mini-app/            # Farcaster mini app

ui/                           # Frontend code (client-side)
├── components/               # Reusable UI components
├── hooks/                    # All React hooks
├── providers/                # React context providers
└── pages/                    # Page-specific components
    ├── account/              # Dashboard UI, modals, tabs
    ├── beta/                 # Beta gating logic
    ├── bounty/               # Attach bounty flow
    ├── home/                 # Public bounty feed
    ├── refund/               # Refund management
    └── wallet/               # Wallet linking UI

server/                       # Backend code (server-only)
├── auth/                     # SIWE helpers
├── blockchain/               # ethers clients, contract helpers
├── db/                       # Prisma client + query helpers
└── config.js                 # Server environment config

integrations/                 # External service integrations
├── github/                   # Octokit, webhooks, templates
└── email/                    # Email templates, sending

lib/                          # Shared utilities (isomorphic)
├── format/                   # Formatting utilities
├── flags/                    # Feature flags
├── logger/                   # Logging utility
├── session/                  # Session management
└── index.js                  # Main exports

api/                          # API client helpers (frontend → backend)
├── client.js                 # Base fetch wrapper
├── bounty.js
├── user.js
└── wallet.js

config/                       # Configuration
├── chain-registry.js         # Network/chain config
└── links.js                  # URL catalog

styles/                       # Global styles
└── globals.css

contracts/                    # Solidity contracts
└── current/
    └── BountyEscrow.sol

docs/reference/               # Technical documentation
```

## Key Documentation Files

When working on this codebase, refer to these docs:

1. **`docs/reference/architecture.md`** - High-level architecture and folder structure
2. **`docs/reference/api.md`** - Complete API endpoint reference
3. **`docs/reference/database.md`** - Database schema, models, relationships
4. **`docs/reference/server.md`** - Server-side modules and patterns
5. **`docs/reference/frontend.md`** - Frontend routes, providers, components
6. **`docs/reference/contracts.md`** - Network registry, contract ABIs, blockchain integration
7. **`docs/reference/flags.md`** - Feature flags system
8. **`docs/reference/logging.md`** - Logging patterns and utilities

## Development Patterns

### Adding a New API Route

1. Create `app/api/<name>/route.js`
2. Validate session/auth early: `const session = await getSession()`
3. Use helpers from `server/*` (never Prisma directly)
4. Return JSON: `Response.json({ success, ... })` or `Response.json({ error }, { status })`
5. Log with `logger` from `@/lib/logger`

**Example:**
```javascript
import { getSession } from '@/lib/session';
import { logger } from '@/lib/logger';
import { bountyQueries } from '@/server/db/prisma';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.githubId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const bounties = await bountyQueries.findBySponsor(session.githubId);
    return Response.json(bounties);
  } catch (error) {
    logger.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Adding a New Frontend Feature

1. Create page-specific components in `ui/pages/<feature-name>/`
2. Create hooks in `ui/hooks/`
3. Create route in `app/<path>/page.jsx`
4. Use `useNetwork()` for chain metadata, `useFlag()` for feature gating
5. Follow existing patterns in similar features

**Example:**
```jsx
// ui/pages/my-feature/MyComponent.jsx
'use client';
import { useNetwork } from '@/ui/providers/NetworkProvider';

export function MyComponent() {
  const { currentNetwork } = useNetwork();
  // ...
}

// app/my-feature/page.jsx
import { MyComponent } from '@/ui/pages/my-feature/MyComponent';

export default function MyFeaturePage() {
  return <MyComponent />;
}
```

### Database Queries

**Always use helpers from `server/db/prisma.js`**, never Prisma client directly:

- `bountyQueries.findById(bountyId)`
- `bountyQueries.findBySponsor(githubId)`
- `bountyQueries.updateStatus(bountyId, status, txHash)`
- `walletQueries.findByGithubId(githubId)`
- `prClaimQueries.findByContributor(githubId)`

These helpers handle:
- BigInt conversions (repoId, etc.)
- Environment filtering (`CONFIG.envTarget`)
- Optional issue metadata detection
- Normalized return values

**Database Setup:**
- Uses PostgreSQL via Prisma ORM
- Schema: `server/db/schema.prisma`
- Migrations: `server/db/migrations/`
- On Vercel, uses connection pooling via `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct) for migrations
- Run migrations: `npx prisma migrate dev` (uses `DIRECT_DATABASE_URL`)
- Generate client: `npx prisma generate`

### Blockchain Interactions

**Always use helpers from `server/blockchain/contract.js`:**

- `getBountyFromContract(bountyId, alias)` - Read on-chain state
- `refundExpiredOnNetwork(bountyId, alias)` - Process refunds
- `resolveBountyOnNetwork(bountyId, recipient, alias)` - Process payouts
- `computeBountyIdOnNetwork(...)` - Compute bounty IDs

These handle:
- Network-specific RPC clients
- Non-1559 gas for Mezo
- Registry lookups
- Error handling

**Client-side:** Use `getContractBounty(bountyId)` from `@/api/bounty` which calls `/api/contract/bounty/[bountyId]`.

### Network Registry

Networks are configured in `config/chain-registry.js`. Each network has:
- `alias` (e.g., `BASE_SEPOLIA`, `MEZO_TESTNET`)
- `chainId`, `rpcUrl`, `contracts.escrow`, `token` (address, symbol, decimals)
- `supports1559` (gas pricing mode)

Access via:
- Server: `REGISTRY[alias]` from `config/chain-registry.js`
- Client: `useNetwork()` hook or `/api/registry` endpoint

### Authentication

**GitHub OAuth:**
- Session stored via `iron-session` (see `lib/session`)
- Session contains: `githubId`, `githubUsername`, `githubAccessToken`
- Check: `const session = await getSession(); if (!session?.githubId) return 401`

**SIWE (Wallet):**
- Session stores: `walletAddress`, `chainId`
- Flow: `/api/nonce` → sign message → `/api/verify-wallet`
- Wallet linking: `/api/wallet/link` (requires both GitHub + wallet session)

**Admin:**
- Check via `ADMIN_GITHUB_IDS` env var (comma-separated GitHub IDs)
- Use `/api/admin/check` endpoint

### Environment Variables

Key env vars (see `server/config.js`):
- `DATABASE_URL` - PostgreSQL connection string (Vercel Postgres)
- `DIRECT_DATABASE_URL` - Direct connection for migrations (Vercel Postgres uses connection pooling)
- `SESSION_SECRET` - iron-session encryption
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` - GitHub App credentials
- `FRONTEND_URL` - Base URL for OAuth callbacks
- `ENV_TARGET` - `stage` or `prod` (filters database queries)
- `<ALIAS>_OWNER_WALLET`, `<ALIAS>_OWNER_PRIVATE_KEY` - Resolver wallets per network
- `BLOCKCHAIN_SUPPORTED_*_ALIASES` - Enabled networks

**Note:** The project is hosted on Vercel. Database connections use Vercel Postgres with connection pooling. The `DATABASE_URL` is for pooled connections (used by Prisma client), while `DIRECT_DATABASE_URL` is for direct connections (used for migrations). See `vercel.json` for deployment configuration.

### Database Models

See `docs/reference/database.md` for full schema. Key models:

- **Bounty**: Core bounty data (bountyId, status, network, etc.)
- **WalletMapping**: GitHub ID → wallet address
- **PrClaim**: PR claims against bounties
- **User**: GitHub user profiles
- **Allowlist**: Address allowlists per user/bounty/repo
- **BetaAccess**: Beta program applications

**Important:** Always filter by `environment` field using `CONFIG.envTarget`.

### Status Values

**Bounty status:** `'open'`, `'resolved'`, `'refunded'` (no cancel — sponsors can only refund after deadline)
**PrClaim status:** `'pending'`, `'paid'`, `'failed'`
**BetaAccess status:** `'pending'`, `'approved'`, `'rejected'`

### Error Handling

- **API routes:** Return `Response.json({ error: string }, { status })`
- **Client:** Use `useErrorModal()` from `@/ui/providers/ErrorModalProvider`
- **Logging:** Use `logger` from `@/lib/logger` (structured logging)

### Testing & Validation

- **Addresses:** Use `validateAddress()` from `server/blockchain/validation.js`
- **Bounty IDs:** Use `validateBytes32()` from same file
- **Database:** Use Prisma helpers, they validate inputs

## Common Tasks

### Adding a New Network

1. Add alias to `CURATED_ALIASES` in `config/chain-registry.js`
2. Set `BLOCKCHAIN_SUPPORTED_*_ALIASES` env var
3. Provide `<ALIAS>_*` env vars (RPC, escrow, token, owner wallet)
4. Set default alias for group if needed

### Adding a New Bounty Status

1. Update Prisma schema (`server/db/schema.prisma`)
2. Run migration: `npx prisma migrate dev`
3. Update `CLOSED_BOUNTY_STATUSES` in relevant API routes
4. Update client-side filters if needed

### Adding a New API Endpoint

1. Create route file in `app/api/<name>/route.js`
2. Add to `docs/reference/api.md`
3. Create client helper in `api/<name>.js` if needed
4. Add to appropriate feature module if UI needed

## Styling

The app uses Tailwind CSS v4 with a custom design system defined in `styles/globals.css`.

### Typography

- **Primary font:** Inter (sans-serif) — `font-inter` or `--font-inter`
- **Display font:** Instrument Serif — `font-instrument-serif` or `--font-instrument-serif`

```jsx
// Use the custom font classes
<h1 className="font-instrument-serif text-4xl">Display Heading</h1>
<p className="font-inter text-base">Body text</p>
```

### Colors (oklch-based)

| Variable | Description | Usage |
| --- | --- | --- |
| `--primary` | Dark brown | Primary actions, brand |
| `--foreground` | Text color | Main text |
| `--muted-foreground` | Secondary text | Descriptions, hints |
| `--border` | Border color | Dividers, card borders |
| `--destructive` | Error/danger | Destructive actions |

```jsx
// Use CSS variables via Tailwind
<button className="bg-primary text-primary-foreground">Action</button>
<p className="text-muted-foreground">Helper text</p>
```

### Custom Utility Classes

```css
.text-balance     /* text-wrap: balance - for headings */
.text-pretty      /* text-wrap: pretty - for body text */
.scrollbar-hide   /* Hide scrollbar */
.premium-btn      /* Primary CTA button styling */
.bounty-card      /* Bounty list card with hover effects */
```

### Component Classes

- `.stat-card` — Statistics display cards
- `.bounty-tag` — Status tags on bounties
- `.nav-link` / `.nav-link.active` — Navigation styling

### Dark Mode

Dark mode is supported via the `.dark` class on the html element. All CSS variables automatically invert.

## Code Style

- **Client components:** Use `'use client'` directive
- **Server code:** No directive (default)
- **Imports:** Use `@/` alias for absolute imports
- **Components:** PascalCase, hooks: `use*`, utilities: camelCase
- **Files:** Match component/hook name (e.g., `MyComponent.jsx`, `useMyHook.js`)

## Where to Look

- **API routes:** `app/api/*/route.js`
- **Database queries:** `server/db/prisma.js`
- **Blockchain helpers:** `server/blockchain/contract.js`
- **GitHub integration:** `integrations/github/*`
- **Email integration:** `integrations/email/*`
- **UI components:** `ui/pages/*/` or `ui/components/`
- **Hooks:** `ui/hooks/`
- **Config:** `config/*` or `server/config.js`
- **Types/validation:** Check existing patterns, use Zod if needed

## Important Notes

1. **Never import Prisma client directly** - always use helpers from `server/db/prisma.js`
2. **Always filter by environment** - use `CONFIG.envTarget` in queries
3. **Use network registry** - don't hardcode chain IDs or addresses
4. **Session validation** - check auth early in API routes
5. **Error responses** - always return JSON with `{ error }` and appropriate status
6. **BigInt handling** - database helpers convert BigInt to Number automatically
7. **Client vs Server** - be aware of what runs where (Next.js App Router)

## Getting Help

- Check existing similar code patterns
- Review `docs/reference/*.md` files
- Look at test files if they exist
- Check `server/db/prisma.js` for query examples
- Review `app/api/*/route.js` for API patterns
