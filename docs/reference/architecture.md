# Architecture Overview

```text
├─ app/                                   # Next.js App Router
│  ├─ (public)/                           # Public pages
│  │  └─ ...                              # Home, attach-bounty, docs, base mini app
│  ├─ (authenticated)/                    # Auth-required pages
│  │  └─ ...                              # Dashboard, link-wallet, refund
│  ├─ (admin)/                            # Admin UI
│  │  └─ ...                              # Beta access tooling
│  └─ (api)/api/                          # HTTP handlers (/api/*)
│     ├─ admin/check                      # Admin status probe
│     ├─ allowlist/[bountyId]/            # Sponsor allowlist CRUD
│     ├─ beta/                            # Beta apply/review/notify
│     ├─ bounty/                          # Bounty CRUD + on-chain reads
│     ├─ contract/bounty/[id]/            # Live escrow read
│     ├─ github/                          # OAuth callback + installations
│     ├─ network/                         # Env cookie + default alias
│     ├─ oauth/                           # GitHub OAuth + logout
│     ├─ registry/                        # Chain registry
│     ├─ resolver/                        # Resolver wallet lookup
│     ├─ user/                            # Dashboard data (profile, stats, claims)
│     ├─ wallet/                          # Wallet linking + lookup
│     ├─ webhooks/github/                 # GitHub App webhook entry
│     └─ ...                              # Other routes (nonce, tokens, stats, etc.)
│
├─ artifacts/                             # Foundry build outputs (ABIs, deps)
├─ contracts/
│  └─ current/                            # Solidity sources (BountyEscrow)
├─ docs/
│  └─ reference/                          # Markdown docs (this folder)
│
├─ features/                              # Client feature modules
│  ├─ account/                            # Dashboard UI + modals + hooks
│  ├─ beta-access/                        # Beta gating hooks/providers
│  ├─ bounty/                             # Attach bounty flow
│  ├─ home/                               # Public feed components/hooks
│  └─ wallet/                             # Wallet modals + helpers
│
├─ shared/                                # Cross-cutting code (UI + API)
│  ├─ api/                                # REST helpers for client fetchers
│  ├─ components/                         # Shared UI primitives
│  ├─ config/                             # Registry + link catalogs
│  ├─ data/                               # Mock/demo data
│  ├─ hooks/                              # Generic React hooks
│  ├─ lib/                                # Logger, flags, formatting, network, session
│  ├─ providers/                          # Providers (wagmi, network, flags, beta)
│  └─ server/                             # Server-only helpers
│     ├─ auth/                            # SIWE helpers
│     ├─ blockchain/                      # ethers clients + validation
│     ├─ db/                              # Prisma client + query helpers
│     ├─ github/                          # Octokit, webhooks, templates
│     └─ notifications/                   # Email utilities (Resend)
│
├─ public/                                # Static assets (icons, manifests, CTAs)
├─ scripts/                               # Local/dev scripts (deploy, tooling)
└─ cache/, pages/, etc.                   # Framework/legacy (do not edit)
```