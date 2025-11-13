# Database Setup for Vercel

## ⚠️ Current Issue

The application currently uses **SQLite** (`better-sqlite3`), which is a file-based database. This works great for local development but **does NOT work** for production on Vercel because:

1. **Serverless functions are stateless** - Each function runs in isolation
2. **No persistent file storage** - Files are ephemeral and cleared between deployments
3. **Data loss on every deployment** - Your database will be reset

## 🔧 Temporary Fix (Already Applied)

I've updated the database to:
- Auto-initialize when needed (no manual `initDB()` calls required)
- Use `/tmp` directory on Vercel (writable but ephemeral)
- Work for local development

**⚠️ THIS IS TEMPORARY**: Data in `/tmp` is cleared on each deployment and cold start.

## ✅ Recommended Solutions for Production

### Option 1: Vercel Postgres (Recommended)

**Best for**: Production apps, managed solution, tight Vercel integration

#### Steps:

1. **Install Vercel Postgres in your project:**
   ```bash
   # Go to Vercel Dashboard → Your Project → Storage → Create Database → Postgres
   ```

2. **Install the Postgres package:**
   ```bash
   npm install @vercel/postgres
   ```

3. **Update `server/db/index.js`** to use Postgres instead of SQLite:
   ```javascript
   import { sql } from '@vercel/postgres';
   
   export async function initDB() {
     // Create tables using Postgres syntax
     await sql`CREATE TABLE IF NOT EXISTS bounties (
       id SERIAL PRIMARY KEY,
       bounty_id TEXT UNIQUE NOT NULL,
       repo_full_name TEXT NOT NULL,
       -- ... rest of columns
     )`;
   }
   ```

4. **Environment variables** (auto-set by Vercel):
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

**Pros:**
- Fully managed by Vercel
- Auto-configured environment variables
- Free tier available
- Persistent data

**Cons:**
- Requires SQL migration from SQLite to Postgres
- Small syntax differences

---

### Option 2: Turso (LibSQL/SQLite Compatible)

**Best for**: Want to keep SQLite compatibility, distributed edge database

#### Steps:

1. **Sign up at [turso.tech](https://turso.tech)**

2. **Install Turso CLI and SDK:**
   ```bash
   npm install @libsql/client
   ```

3. **Create a database:**
   ```bash
   turso db create bounty-prod
   turso db show bounty-prod
   ```

4. **Get connection URL and token:**
   ```bash
   turso db show bounty-prod --url
   turso db tokens create bounty-prod
   ```

5. **Update `server/db/index.js`:**
   ```javascript
   import { createClient } from '@libsql/client';
   
   const client = createClient({
     url: process.env.TURSO_DATABASE_URL,
     authToken: process.env.TURSO_AUTH_TOKEN,
   });
   
   export function getDB() {
     return client;
   }
   ```

6. **Add environment variables to Vercel:**
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`

**Pros:**
- SQLite-compatible (minimal migration)
- Distributed/edge database
- Free tier available

**Cons:**
- Slight API differences from better-sqlite3

---

### Option 3: Supabase (Postgres + Realtime)

**Best for**: Need additional features (auth, storage, realtime)

#### Steps:

1. **Sign up at [supabase.com](https://supabase.com)**

2. **Create a new project**

3. **Install Supabase client:**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Update database code** to use Supabase Postgres

5. **Add environment variables to Vercel:**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Pros:**
- Full Postgres with additional features
- Good free tier
- Great dashboard and tooling

**Cons:**
- More features than needed for simple use case
- Requires SQL migration

---

### Option 4: PlanetScale (MySQL)

**Best for**: Prefer MySQL, need branching/migrations

#### Steps:

1. **Sign up at [planetscale.com](https://planetscale.com)**

2. **Create a database**

3. **Install Prisma (recommended for MySQL):**
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```

4. **Initialize Prisma and migrate schema**

**Pros:**
- Excellent branching workflow
- Good free tier
- Built-in migration tools

**Cons:**
- MySQL syntax (not Postgres or SQLite)
- Requires significant migration

---

## 🚀 Quick Start: Vercel Postgres Migration

Here's a complete example of migrating to Vercel Postgres:

### 1. Add Vercel Postgres to your project

In Vercel Dashboard:
- Go to your project → **Storage** tab
- Click **Create Database** → **Postgres**
- Name it `bounty-db` → **Create**

### 2. Update package.json

```bash
npm install @vercel/postgres
```

### 3. Create new database adapter (`server/db/postgres.js`)

```javascript
import { sql } from '@vercel/postgres';

export async function initDB() {
  // Create bounties table
  await sql`
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
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      pinned_comment_id BIGINT,
      UNIQUE(repo_id, issue_number, sponsor_address, network)
    )
  `;

  // Create wallet_mappings table
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_mappings (
      id SERIAL PRIMARY KEY,
      github_id BIGINT UNIQUE NOT NULL,
      github_username TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      verified_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;

  // Create pr_claims table
  await sql`
    CREATE TABLE IF NOT EXISTS pr_claims (
      id SERIAL PRIMARY KEY,
      bounty_id TEXT NOT NULL,
      pr_number INTEGER NOT NULL,
      pr_author_github_id BIGINT NOT NULL,
      repo_full_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at BIGINT NOT NULL,
      resolved_at BIGINT,
      tx_hash TEXT,
      FOREIGN KEY(bounty_id) REFERENCES bounties(bounty_id)
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_bounties_repo ON bounties(repo_id, issue_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bounties_token ON bounties(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bounties_token_status ON bounties(token, status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pr_claims_bounty ON pr_claims(bounty_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wallet_github ON wallet_mappings(github_id)`;
}

// Example query adapters
export const bountyQueries = {
  create: async (bountyData) => {
    const result = await sql`
      INSERT INTO bounties (
        bounty_id, repo_full_name, repo_id, issue_number,
        sponsor_address, sponsor_github_id, token, amount, deadline,
        status, tx_hash, network, chain_id, token_symbol, created_at, updated_at
      ) VALUES (
        ${bountyData.bountyId}, ${bountyData.repoFullName}, ${bountyData.repoId},
        ${bountyData.issueNumber}, ${bountyData.sponsorAddress}, ${bountyData.sponsorGithubId},
        ${bountyData.token}, ${bountyData.amount}, ${bountyData.deadline},
        ${bountyData.status}, ${bountyData.txHash}, ${bountyData.network || 'BASE_SEPOLIA'},
        ${bountyData.chainId || 84532}, ${bountyData.tokenSymbol || 'USDC'},
        ${Date.now()}, ${Date.now()}
      )
      RETURNING *
    `;
    return result.rows[0];
  },

  findByIssue: async (repoId, issueNumber) => {
    const result = await sql`
      SELECT * FROM bounties
      WHERE repo_id = ${repoId} AND issue_number = ${issueNumber} AND status = 'open'
      ORDER BY created_at DESC
    `;
    return result.rows;
  },

  findById: async (bountyId) => {
    const result = await sql`
      SELECT * FROM bounties WHERE bounty_id = ${bountyId}
    `;
    return result.rows[0];
  },
};

export const walletQueries = {
  create: async (githubId, githubUsername, walletAddress) => {
    const result = await sql`
      INSERT INTO wallet_mappings (
        github_id, github_username, wallet_address, verified_at, created_at
      ) VALUES (
        ${githubId}, ${githubUsername}, ${walletAddress.toLowerCase()},
        ${Date.now()}, ${Date.now()}
      )
      ON CONFLICT (github_id)
      DO UPDATE SET
        github_username = EXCLUDED.github_username,
        wallet_address = EXCLUDED.wallet_address,
        verified_at = EXCLUDED.verified_at
      RETURNING *
    `;
    return result.rows[0];
  },

  findByGithubId: async (githubId) => {
    const result = await sql`
      SELECT * FROM wallet_mappings WHERE github_id = ${githubId}
    `;
    return result.rows[0];
  },

  findByWallet: async (walletAddress) => {
    const result = await sql`
      SELECT * FROM wallet_mappings WHERE wallet_address = ${walletAddress.toLowerCase()}
    `;
    return result.rows[0];
  },
};
```

### 4. Update imports in API routes

Change:
```javascript
import { walletQueries } from '@/server/db/index';
```

To:
```javascript
import { walletQueries } from '@/server/db/postgres';
```

### 5. Deploy to Vercel

The Postgres connection is automatically configured via environment variables.

---

## 📊 Comparison Table

| Solution | Cost | Migration Effort | Compatibility | Best For |
|----------|------|------------------|---------------|----------|
| **Vercel Postgres** | Free tier | Medium | Postgres | Production apps on Vercel |
| **Turso** | Free tier | Low | SQLite | SQLite compatibility |
| **Supabase** | Free tier | Medium | Postgres | Full-featured backend |
| **PlanetScale** | Free tier | High | MySQL | MySQL + branching |
| **SQLite in /tmp** | Free | None | SQLite | **Dev/testing only** |

---

## 🎯 Recommendation

For your use case, I recommend **Vercel Postgres** because:
1. Seamless Vercel integration
2. Auto-configured environment variables
3. Generous free tier (60 hours compute/month)
4. Production-ready
5. No external service to manage

Would you like me to help you migrate to Vercel Postgres?

