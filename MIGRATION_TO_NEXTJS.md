# Vite to Next.js Migration Complete ✅

This document provides a comprehensive overview of the migration from Vite + Express to Next.js 15 with App Router.

## Migration Status

**Status:**  Complete  
**Framework:** Next.js 15.1.6 with App Router  
**Date:** November 2024  

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app runs on `http://localhost:3000` (unified frontend + backend).

## Architecture Changes

### Before (Vite + Express)
- **Frontend**: Vite dev server (port 5173) + production build served by Express
- **Backend**: Express server (port 3000) with API routes
- **Session**: express-session with in-memory store
- **Routing**: React Router DOM (client-side)

### After (Next.js)
- **Unified**: Next.js server (port 3000) handles both frontend and API
- **Session**: iron-session with encrypted cookies
- **Routing**: Next.js App Router (file-based, server-side)
- **Rendering**: Server-side rendering with client components

## Files Removed

### Configuration & Build
- ✅ `vite.config.js` → `next.config.js`
- ✅ `index.html` → `app/layout.jsx`
- ✅ `dist/` → `.next/`

### Source Files (Entire `src/` directory)
- ✅ `src/main.jsx` - Entry point (no longer needed)
- ✅ `src/App.jsx` → `app/page.jsx`
- ✅ `src/index.css` → `app/globals.css`
- ✅ `src/components/` → `components/`
- ✅ `src/config/` → `config/`
- ✅ `src/pages/Home.jsx` → `app/page.jsx`
- ✅ `src/pages/AttachBounty.jsx` → `app/attach-bounty/page.jsx`
- ✅ `src/pages/LinkWallet.jsx` → `app/link-wallet/page.jsx`
- ✅ `src/pages/Refund.jsx` → `app/refund/page.jsx`

### Server Files
- ✅ `server/index.js` - Express server (replaced by Next.js)
- ✅ `server/routes/api.js` - Express API routes (migrated to `app/api/`)
- ✅ `server/routes/oauth.js` - Express OAuth routes (migrated to `app/api/oauth/`)

## New File Structure

```
bounty/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers (15+ routes)
│   │   ├── bounty/
│   │   ├── wallet/
│   │   ├── oauth/
│   │   └── webhooks/
│   ├── attach-bounty/     # Pages
│   ├── link-wallet/
│   ├── refund/
│   ├── layout.jsx         # Root layout with HTML structure
│   ├── page.jsx           # Home page
│   └── globals.css        # Global styles
├── components/            # Shared React components
├── config/               # Configuration files
├── lib/                  # Utilities (session management)
├── server/               # Server-side logic (unchanged)
│   ├── auth/
│   ├── blockchain/
│   ├── db/
│   └── github/
├── public/               # Static assets
├── next.config.js        # Next.js configuration
└── jsconfig.json         # Path aliases
```

## Dependencies

### Removed
- ❌ `vite@^7.1.12`
- ❌ `@vitejs/plugin-react@^5.1.0`
- ❌ `express@^4.18.2`
- ❌ `express-session@^1.17.3`
- ❌ `cors@^2.8.5`
- ❌ `helmet@^7.1.0`
- ❌ `nodemon@^3.0.2`
- ❌ `react-router-dom@^7.9.5`

### Added
- ✅ `next@^15.1.6` - Next.js framework
- ✅ `iron-session@^8.0.3` - Session management
- ✅ `@types/node`, `@types/react`, `@types/react-dom` - TypeScript types

## API Route Migrations

All Express routes migrated to Next.js API routes:

| Old Express Route | New Next.js Route | Status |
|------------------|------------------|--------|
| `/api/nonce` | `app/api/nonce/route.js` | ✅ |
| `/api/verify-wallet` | `app/api/verify-wallet/route.js` | ✅ |
| `/oauth/github` | `app/api/oauth/github/route.js` | ✅ |
| `/oauth/callback` | `app/api/oauth/callback/route.js` | ✅ |
| `/oauth/user` | `app/api/oauth/user/route.js` | ✅ |
| `/oauth/logout` | `app/api/oauth/logout/route.js` | ✅ |
| `/api/bounty/create` | `app/api/bounty/create/route.js` | ✅ |
| `/api/bounty/:bountyId` | `app/api/bounty/[bountyId]/route.js` | ✅ |
| `/api/issue/:repoId/:issueNumber` | `app/api/issue/[repoId]/[issueNumber]/route.js` | ✅ |
| `/api/wallet/link` | `app/api/wallet/link/route.js` | ✅ |
| `/api/wallet/:githubId` | `app/api/wallet/[githubId]/route.js` | ✅ |
| `/api/contract/bounty/:bountyId` | `app/api/contract/bounty/[bountyId]/route.js` | ✅ |
| `/api/tokens` | `app/api/tokens/route.js` | ✅ |
| `/api/stats` | `app/api/stats/route.js` | ✅ |
| `/webhooks/github` | `app/api/webhooks/github/route.js` | ✅ |
| `/github/callback` | `app/api/github/callback/route.js` | ✅ |
| `/health` | `app/api/health/route.js` | ✅ |

## Environment Variables

### Updated
All client-side environment variables now require `NEXT_PUBLIC_` prefix:

- `VITE_MEZO_RPC_URL` → `NEXT_PUBLIC_MEZO_RPC_URL`

### Required Environment Variables
```bash
# Session
SESSION_SECRET=your-secret-here

# GitHub App
GITHUB_APP_ID=your-app-id
GITHUB_PRIVATE_KEY=your-private-key
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Blockchain
ESCROW_CONTRACT=0x...
RESOLVER_PRIVATE_KEY=0x...

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Optional: Custom Mezo RPC
NEXT_PUBLIC_MEZO_RPC_URL=https://mezo-testnet.drpc.org
```

## Session Management

### Before (express-session)
```javascript
app.use(session({
  secret: CONFIG.sessionSecret,
  resave: false,
  saveUninitialized: false
}));

req.session.githubId = userId;
res.json({ success: true });
```

### After (iron-session)
```javascript
// lib/session.js
import { getIronSession } from 'iron-session';

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

// In API routes
const session = await getSession();
session.githubId = userId;
await session.save();
return Response.json({ success: true });
```

## Key Technical Details

### Client Components
All pages using React hooks are marked with `'use client'`:
```jsx
'use client';

import { useState } from 'react';

export default function MyPage() {
  const [state, setState] = useState();
  // ...
}
```

### Server-Side Imports
Server logic accessed via `@/` alias:
```javascript
import { bountyQueries } from '@/server/db/index';
import { getSession } from '@/lib/session';
```

### Path Aliases (jsconfig.json)
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Deployment

### Scripts (package.json)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "migrate": "node server/db/migrate.js"
  }
}
```

### Vercel

Next.js is optimized for Vercel deployment. Simply connect your repository and Vercel will automatically:
- Detect Next.js and use the correct build settings
- Run `npm run build` automatically
- Set up serverless functions for API routes
- Configure environment variables in the Vercel dashboard

**Environment Variables to Set in Vercel:**
- `SESSION_SECRET`
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `ESCROW_CONTRACT`, `RESOLVER_PRIVATE_KEY`
- `FRONTEND_URL` (set to your Vercel domain)
- `DATABASE_PATH` (optional, for SQLite)
- `NEXT_PUBLIC_MEZO_RPC_URL` (optional)

## Migration Benefits

✅ **Unified Codebase** - Single port, no proxying needed  
✅ **Better SEO** - Server-side rendering for landing pages  
✅ **Improved DX** - Fast refresh, better error messages  
✅ **Simplified Deployment** - Single build artifact  
✅ **Type Safety** - Built-in TypeScript support  
✅ **Performance** - Automatic code splitting and optimization  
✅ **Security** - Encrypted session cookies with iron-session  

## Testing Checklist

- [x] Home page loads at `/`
- [x] Attach bounty flow works at `/attach-bounty`
- [x] Link wallet flow works at `/link-wallet`
- [x] Refund flow works at `/refund`
- [x] GitHub OAuth authentication works
- [x] Wallet signature verification works
- [x] All API routes respond correctly
- [x] Session persists across requests
- [x] Webhook signature verification works
- [x] Database migrations run successfully

## Common Issues & Solutions

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module Resolution Errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Session Issues
Ensure `SESSION_SECRET` is set in your environment variables.

### Database Errors
```bash
npm run migrate
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Iron Session](https://github.com/vvo/iron-session)

## Support

For issues or questions about the migration:
1. Check this document for common solutions
2. Review the Next.js documentation
3. Open an issue in the repository

---

**Migration completed successfully! The project is now 100% Next.js.**

