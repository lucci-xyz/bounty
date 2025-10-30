## Using sqlite3 CLI (recommended)

### Open the DB:
``` sqlite3
sqlite3 /Users/nataliehill/Developer/Github/lucci/bounty/server/db/bounty.db
```

### Inside the prompt, list tables and schema:
- ``` sqlite3 .tables.schema ```
- ``` sqlite3 bounties.schema ```
- ``` sqlite3 wallet_mappings.schema ```
- ``` sqlite3 pr_claims ```

### View rows:
``` sqlite3
SELECT * FROM bounties ORDER BY created_at DESC LIMIT 20;
``` 
``` sqlite3
SELECT * FROM bounties ORDER BY created_at DESC LIMIT 20;SELECT * FROM wallet_mappings ORDER BY created_at DESC LIMIT 20;
```
``` sqlite3
SELECT * FROM pr_claims ORDER BY created_at DESC LIMIT 20;
```
### Optional checks:
``` sqlite3
PRAGMA journal_mode;         -- should show walSELECT COUNT(*) FROM bounties;.quit
```

### Dump everything to a file:
``` sqlite3
sqlite3 /Users/nataliehill/Developer/Github/lucci/bounty/server/db/bounty.db ".dump" > /tmp/bountypay_dump.sql
```