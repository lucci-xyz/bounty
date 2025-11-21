# Frontend Overview

Next.js App Router powers the UI. Global layout wraps every page with `Providers` (wagmi, RainbowKit, TanStack Query) and `NetworkProvider` (registry + cookie-backed env selector), then renders the shared `Navbar` and `Footer`. Styling lives in `globals.css` with the accent palette:

- Primary `#00827B`
- Secondary `#39BEB7`
- Tertiary `#83EEE8`

Dummy screens can be toggled through `NEXT_PUBLIC_USE_DUMMY_DATA=true`.

## Routes

| Path | File | Purpose | Key data sources |
| --- | --- | --- | --- |
| `/` | `app/(public)/page.jsx` | Public bounty board with filters, sorting, and responsive cards. | `/api/bounties/open`, `useNetwork`, optional dummy data |
| `/attach-bounty` | `app/(public)/attach-bounty/page.jsx` | Handles the post-GitHub-App flow for funding an issue; also shows GitHub App install CTA if opened directly. | Query params from GitHub, `useNetwork`, `/api/resolver`, `/api/bounty/create` |
| `/account` | `app/(authenticated)/account/page.jsx` | Combined sponsor + contributor hub with tabs for Sponsored, Earnings, Settings, and (optionally) Admin. Accepts `?tab=` for deep links. | `/api/oauth/user`, `/api/user/bounties`, `/api/user/stats`, `/api/wallet/:id`, `/api/user/profile`, `/api/user/claimed-bounties`, `/api/github/installations` |
| `/account/bounty/[bountyId]` | `app/(authenticated)/account/bounty/[bountyId]/page.jsx` | Owner view for a single bounty plus allowlist management. | `/api/bounty/:id`, `/api/allowlist/:id` |
| `/link-wallet` | `app/(authenticated)/link-wallet/page.jsx` | Guides contributors or sponsors through GitHub auth, wallet connect, SIWE verification, and `/api/wallet/link`. Supports `returnTo` and `action=change`. | `/api/oauth/user`, `/api/user/profile`, `/api/nonce`, `/api/verify-wallet`, `/api/wallet/link` |
| `/refund` | `app/(authenticated)/refund/page.jsx` | Lets sponsors run `refundExpired` on the escrow contract after a deadline lapses. | `useNetwork`, on-chain contract via wagmi wallet, optional `/account/bounty` deep link |

## Supporting Files

- `globals.css`: defines typography, spacing, card styles, and the color tokens listed above. Keep UI tweaks consistent with these variables.
- `shared/data/`: mock responses for the home feed and dashboard screens when `NEXT_PUBLIC_USE_DUMMY_DATA` is enabled.

See `app/api/README.md` for backend route behavior.

# UI Components

All shared UI for the App Router pages lives here. Components follow the same color tokens defined in `globals.css` (primary `#00827B`, secondary `#39BEB7`, tertiary `#83EEE8`) so new screens stay consistent—prefer extending these pieces instead of hand-rolling styles.

## Providers & Context

| Component | File | Responsibility |
| --- | --- | --- |
| `Providers` | `shared/components/Providers.jsx` | Boots wagmi, RainbowKit, and TanStack Query with the accent palette and exposes them to the tree. |
| `NetworkProvider` / `useNetwork` | `shared/components/NetworkProvider.jsx` | Fetches the registry from `/api/registry`, reads/writes the `mainnet`/`testnet` cookie, and surfaces helpers for switching aliases plus metadata about the active chain. |

## Layout Shell

| Component | File | Notes |
| --- | --- | --- |
| `Navbar` | `shared/components/Navbar.jsx` | Sticky bar with GitHub session awareness, network toggle, and auth CTA. |
| `Footer` | `shared/components/Footer.jsx` | Minimal footer with brand text and socials. |
| `Socials` | `shared/components/Socials.jsx` | Reusable list of external links/icons used inside the footer and hero sections. |

## Cards & Flows

| Component | File | Primary props / behavior |
| --- | --- | --- |
| `BountyCard` | `features/bounty/components/BountyCard.jsx` | Renders a bounty summary, formats amounts/deadlines, and optionally shows management actions (`showActions`, `onManage`). |
| `AllowlistManager` | `features/account/components/AllowlistManager.jsx` | Sponsor-only editor that calls `/api/allowlist/:bountyId` to add/remove addresses. Props: `bountyId`, `initialAllowlist`. |
| `WalletLinkModal` | `features/wallet/components/WalletLinkModal.jsx` | Simple modal for kicking users over to `/link-wallet` while preserving `returnTo`. Props: `isOpen`, `onClose`, `walletType` (`funding` or `payout`). |

## Utility Bits

| Component | File | Usage |
| --- | --- | --- |
| `UserAvatar` | `shared/components/UserAvatar.jsx` | Circle avatar with GitHub fallback initial. Props: `username`, `avatarUrl`, `size`. |
| `Avatar`, `AvatarImage`, `AvatarFallback` | `shared/components/ui/avatar.jsx` | Radix-backed primitives for cases that need more control than `UserAvatar`. |
| Icons | `shared/components/Icons.jsx` | Central export for the inline SVG icon set (GitHub, wallet, target, etc.). Import from here instead of embedding SVGs. |

Add new UI here when it could be reused in more than one page; otherwise keep page-specific elements inside their route directory.

