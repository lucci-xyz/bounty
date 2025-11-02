# Working with the Local SQLite DB

Need to inspect what the bot stored? Grab the SQLite CLI and follow this quick tour.

---

## 1. Open the database

```bash
sqlite3 server/db/bounty.db
```

> Tip: add the path to an alias if you hop in frequently.

---

## 2. Inspect schema & tables

Inside the SQLite prompt, run:

```sql
.tables
.schema bounties
.schema wallet_mappings
.schema pr_claims
```

---

## 3. Explore recent activity

```sql
SELECT * FROM bounties ORDER BY created_at DESC LIMIT 20;
SELECT * FROM wallet_mappings ORDER BY created_at DESC LIMIT 20;
SELECT * FROM pr_claims ORDER BY created_at DESC LIMIT 20;
```

---

## 4. Quick health checks

```sql
PRAGMA journal_mode; -- expect "wal"
SELECT COUNT(*) FROM bounties;
```

---

## 5. Dump everything to a file

```bash
sqlite3 server/db/bounty.db ".dump" > /tmp/bountypay_dump.sql
```

Keep the dump handy for migrations, support requests, or reproducible bug reports.
