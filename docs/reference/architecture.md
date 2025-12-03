# Architecture Overview

```text
├─ app/                                   # Next.js App Router
│  ├─ page.jsx                            # Landing page (/)
│  ├─ layout.jsx                          # Root layout with providers
│  ├─ api/                                # HTTP handlers (/api/*)
│  │  ├─ admin/                           # Admin status + fees
│  │  ├─ allowlist/[bountyId]/            # Sponsor allowlist CRUD
│  │  ├─ beta/                            # Beta apply/review/notify
│  │  ├─ bounty/                          # Bounty CRUD + on-chain reads
│  │  ├─ contract/bounty/[id]/            # Live escrow read
│  │  ├─ github/                          # OAuth callback + installations
│  │  ├─ network/                         # Env cookie + default alias
│  │  ├─ oauth/                           # GitHub OAuth + logout
│  │  ├─ registry/                        # Chain registry
│  │  ├─ resolver/                        # Resolver wallet lookup
│  │  ├─ user/                            # Dashboard data (profile, stats, claims)
│  │  ├─ wallet/                          # Wallet linking + lookup
│  │  ├─ webhooks/github/                 # GitHub App webhook entry
│  │  └─ ...                              # Other routes (nonce, tokens, stats, etc.)
│  ├─ app/                                # /app/* routes
│  │  ├─ account/                         # Dashboard page
│  │  ├─ attach-bounty/                   # Funding flow
│  │  └─ link-wallet/                     # Wallet linking
│  ├─ admin/                              # Admin UI
│  │  └─ beta/                            # Beta access tooling
│  └─ base-mini-app/                      # Farcaster mini app
│
├─ ui/                                    # Frontend code (client-side)
│  ├─ components/                         # Reusable UI components
│  │  ├─ Icons.jsx                        # Consolidated SVG icons
│  │  ├─ Navbar.jsx                       # Navigation bar
│  │  ├─ Footer.jsx                       # Site footer
│  │  └─ ...                              # StatusNotice, UserAvatar, etc.
│  ├─ hooks/                              # All React hooks
│  │  ├─ useAccountPage.js                # Dashboard state management
│  │  ├─ useBountyFeed.js                 # Bounty feed data
│  │  ├─ useGithubUser.js                 # GitHub auth state
│  │  └─ ...                              # Other hooks
│  ├─ providers/                          # React context providers
│  │  ├─ Providers.jsx                    # wagmi, RainbowKit, TanStack Query
│  │  ├─ NetworkProvider.jsx              # Network/chain state
│  │  ├─ FlagProvider.jsx                 # Feature flags
│  │  └─ BetaAccessProvider.jsx           # Beta gating
│  └─ pages/                              # Page-specific components
│     ├─ account/                         # Dashboard tabs, modals
│     ├─ beta/                            # Beta access UI
│     ├─ bounty/                          # Attach bounty flow
│     ├─ home/                            # Landing + bounty feed
│     ├─ refund/                          # Refund UI
│     └─ wallet/                          # Wallet modals
│
├─ server/                                # Backend code (server-only)
│  ├─ auth/                               # SIWE helpers
│  ├─ blockchain/                         # ethers clients + validation
│  ├─ db/                                 # Prisma client + query helpers
│  │  ├─ schema.prisma                    # Database schema
│  │  ├─ prisma.js                        # Query namespaces
│  │  └─ migrations/                      # Migration files
│  └─ config.js                           # Server environment config
│
├─ integrations/                          # External service integrations
│  ├─ github/                             # GitHub App integration
│  │  ├─ client.js                        # Octokit setup
│  │  ├─ webhooks/                        # Webhook handlers
│  │  ├─ templates/                       # Comment templates
│  │  └─ services/                        # Formatting, alerts
│  └─ email/                              # Email integration
│     ├─ email.js                         # Nodemailer sender
│     └─ templates/                       # Email templates
│
├─ lib/                                   # Shared utilities (isomorphic)
│  ├─ format/                             # Formatting utilities
│  ├─ flags/                              # Feature flags
│  ├─ logger/                             # Logging utility
│  ├─ session/                            # Session management
│  ├─ style/                              # Status styles
│  └─ index.js                            # Main exports
│
├─ api/                                   # API client helpers (frontend → backend)
│  ├─ client.js                           # Base fetch wrapper
│  ├─ bounty.js                           # Bounty API calls
│  ├─ user.js                             # User API calls
│  └─ wallet.js                           # Wallet API calls
│
├─ config/                                # Configuration
│  ├─ chain-registry.js                   # Network/chain config
│  └─ links.js                            # URL catalog
│
├─ styles/                                # Global styles
│  └─ globals.css                         # Tailwind + CSS variables
│
├─ contracts/                             # Solidity contracts
│  └─ current/                            # BountyEscrow source
│
├─ artifacts/                             # Foundry build outputs (ABIs)
├─ public/                                # Static assets (icons, buttons)
├─ scripts/                               # Deploy scripts
└─ docs/reference/                        # This documentation
```
