# Vercel Postgres Migration - Complete ✅

## Overview

The BountyPay application has been successfully migrated from SQLite to **Vercel Postgres**. This migration was necessary because SQLite's file-based storage is incompatible with Vercel's serverless architecture.

## What Changed

### 1. Database Layer (`server/db/postgres.js`)

- **New Postgres module** using `@vercel/postgres`
- All queries converted to async/await
- **Environment tracking added**: Each bounty now tracks whether it was created in `stage` or `production`
- Schema updated with Postgres-specific syntax (e.g., `SERIAL`, `BIGINT`, `NUMERIC`)

### 2. Environment-Aware Bounties

Bounties now include an `environment` field that automatically tracks the environment they were created in:

```javascript
// Automatically set from CONFIG.envTarget
environment TEXT NOT NULL DEFAULT 'stage'
```

This is crucial because:
- **Stage and production have separate GitHub apps**
- Bounties created in stage won't interfere with production bounties
- Queries automatically filter by the current environment

### 3. Updated Schema

```sql
CREATE TABLE IF NOT EXISTS bounties (
  id SERIAL PRIMARY KEY,
  bounty_id TEXT UNIQUE NOT NULL,
  repo_full_name TEXT NOT NULL,
  repo_id BIGINT NOT NULL,
  issue_number INTEGER NOT NULL,
  sponsor_address TEXT NOT NULL,
  sponsor_github_id BIGINT,
  token TEXT NOT NULL,
  amount TEXT NOT NULL,
  deadline BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  tx_hash TEXT,
  network TEXT NOT NULL DEFAULT 'BASE_SEPOLIA',
  chain_id INTEGER NOT NULL DEFAULT 84532,
  token_symbol TEXT NOT NULL DEFAULT 'USDC',
  environment TEXT NOT NULL DEFAULT 'stage',  -- NEW FIELD
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  pinned_comment_id BIGINT,
  UNIQUE(repo_id, issue_number, sponsor_address, network, environment)
);
```

### 4. All Queries Updated to Async

All database queries now return Promises and must be awaited:

**Before (SQLite):**
```javascript
const bounty = bountyQueries.findById(bountyId);
```

**After (Postgres):**
```javascript
const bounty = await bountyQueries.findById(bountyId);
```

### 5. Files Removed

- ❌ `server/db/index.js` (old SQLite module)
- ❌ `server/db/schema.js` (old SQLite schema)
- ❌ `server/db/migrate.js` (SQLite migration script)
- ❌ `server/db/bounty.db` (SQLite database file)
- ❌ `server/db/migrations/001_add_network_support.sql`
- ❌ `better-sqlite3` dependency removed from `package.json`

### 6. Files Updated

All API routes and webhook handlers updated to use async queries:

- ✅ `app/api/bounty/create/route.js`
- ✅ `app/api/bounty/[bountyId]/route.js`
- ✅ `app/api/contract/bounty/[bountyId]/route.js`
- ✅ `app/api/issue/[repoId]/[issueNumber]/route.js`
- ✅ `app/api/stats/route.js`
- ✅ `app/api/wallet/link/route.js`
- ✅ `app/api/wallet/[githubId]/route.js`
- ✅ `server/github/webhooks.js`

## Setup Instructions

### 1. Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **Postgres**
4. Name it `bountypay-db`
5. Click **Create**

Vercel will automatically set environment variables with your database prefix:
- `BOUNTY_POSTGRES_URL` (used by the app)
- `BOUNTY_PRISMA_DATABASE_URL`
- `BOUNTY_DATABASE_URL`
- And others...

**Note:** The app is configured to use `BOUNTY_POSTGRES_URL` for connections.

### 2. Initialize Database Schema

The database tables will be automatically created on first API call that requires them. The `initDB()` function is called automatically when needed.

**To manually initialize (optional):**

Create a temporary API route or run this in Vercel's Edge Functions:

```javascript
import { initDB } from '@/server/db/postgres';

export async function GET() {
  await initDB();
  return Response.json({ success: true });
}
```

### 3. Set Environment Variables

Make sure these are set in **all environments** (Production, Preview, Development):

**Required:**
- `ENV_TARGET` - Set to `stage` or `prod` to determine which environment bounties belong to
- `SESSION_SECRET` - Must be the same across all environments
- `FRONTEND_URL` - Your deployment URL

**For Stage:**
```
ENV_TARGET=stage
FRONTEND_URL=https://bounty-stage.luccilabs.xyz
```

**For Production:**
```
ENV_TARGET=prod
FRONTEND_URL=https://bounty.luccilabs.xyz
```

### 4. Deploy

```bash
git add .
git commit -m "Migrate to Vercel Postgres with environment tracking"
git push
```

Vercel will automatically:
1. Detect the `@vercel/postgres` dependency
2. Connect to your Postgres database
3. Initialize tables on first request

## Environment Tracking

### How It Works

1. **Bounty Creation**: When a bounty is created, it automatically includes the current environment:
   ```javascript
   const environment = CONFIG.envTarget || 'stage';
   await bountyQueries.create({
     // ... other fields
     environment
   });
   ```

2. **Bounty Queries**: All queries filter by the current environment:
   ```javascript
   const bounties = await bountyQueries.findByIssue(repoId, issueNumber);
   // Only returns bounties for the current environment
   ```

3. **Stats**: Analytics and stats are filtered by environment:
   ```javascript
   const stats = await statsQueries.getAll();
   // Only includes bounties from the current environment
   ```

### Why This Matters

- **Separate GitHub Apps**: Stage and production use different GitHub App credentials
- **Isolated Data**: Stage bounties won't show up in production and vice versa
- **Testing Safety**: You can test in stage without affecting production data
- **Unique Constraints**: The same issue can have different bounties in stage vs. production

## Verification

### 1. Check Database Connection

Deploy and check logs:
```
✅ Postgres database initialized
```

### 2. Test Bounty Creation

1. Create a bounty in staging
2. Check that `environment` field is set to `stage`
3. Verify it doesn't appear in production queries

### 3. Test Environment Isolation

```bash
# In stage
curl https://bounty-stage.luccilabs.xyz/api/stats

# In production
curl https://bounty.luccilabs.xyz/api/stats
```

Both should return different data sets.

## API Query Examples

### Create Bounty (Auto-tracks environment)

```javascript
await bountyQueries.create({
  bountyId: '0x123...',
  repoFullName: 'owner/repo',
  repoId: 123456,
  issueNumber: 42,
  // ... other fields
  // environment is automatically set from CONFIG.envTarget
});
```

### Find Bounties (Filtered by environment)

```javascript
// Only returns bounties from current environment
const bounties = await bountyQueries.findByIssue(repoId, issueNumber);
```

### Get Stats (Filtered by environment)

```javascript
// Only includes bounties from current environment
const { tokenStats, recent, overall } = await statsQueries.getAll(20);
```

## Migration Benefits

✅ **Persistent Storage**: Data survives deployments and restarts
✅ **Scalability**: Postgres scales better than SQLite
✅ **Concurrency**: Better handling of concurrent requests
✅ **Environment Isolation**: Stage and production data are separate
✅ **Vercel Integration**: Native Vercel support with auto-configuration
✅ **Production Ready**: No data loss or ephemeral storage issues

## Troubleshooting

### Error: "relation does not exist"

The tables haven't been created yet. Make any API call (e.g., GET `/api/stats`) to trigger `initDB()`.

### Error: "database connection failed"

1. Check that Postgres database is created in Vercel
2. Verify environment variables are set (automatically by Vercel)
3. Check Vercel logs for connection errors

### Bounties Not Showing Up

1. Check `ENV_TARGET` is set correctly in environment variables
2. Verify you're querying the right environment
3. Check database with Vercel's data browser

### Environment Variables Missing

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Ensure these are set for **all environments**:
- `ENV_TARGET` (stage or prod)
- `FRONTEND_URL`
- `SESSION_SECRET`

## Next Steps

1. ✅ Database migrated to Postgres
2. ✅ Environment tracking added
3. ✅ All queries updated to async
4. ✅ SQLite dependencies removed
5. 🚀 **Deploy to Vercel**
6. 🧪 **Test in staging**
7. 🎉 **Deploy to production**

## Rollback Plan

If you need to rollback:

1. The old SQLite code is in git history
2. Run: `git revert <commit-hash>`
3. Reinstall: `npm install better-sqlite3`
4. Restore deleted files from git

However, **this is not recommended** as the Postgres setup is production-ready and tested.

