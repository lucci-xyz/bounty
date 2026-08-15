-- Track whether the expiry notification for a bounty has been sent.
--
-- The daily cron previously decided this from a time window: notify bounties
-- that expired between 0 and 25 hours ago. On a 24-hour schedule the one-hour
-- overlap guaranteed duplicate mail, and any run that failed or ran late put a
-- bounty permanently out of range, so its sponsor was never notified at all.
-- Both outcomes were silent.
--
-- NOTE: apply this migration before deploying the code that reads the column.

ALTER TABLE "bounties" ADD COLUMN "expiry_notified_at" BIGINT;

-- Backfill: treat every bounty that expired more than 25 hours before this
-- migration as already handled. Under the old window those were unreachable, so
-- marking them prevents the first run after deploy from mailing every sponsor
-- whose bounty has ever expired.
UPDATE "bounties"
SET "expiry_notified_at" = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
WHERE "status" = 'open'
  AND "deadline" < (EXTRACT(EPOCH FROM NOW()) - 25 * 3600)::BIGINT;

-- The cron scans open, un-notified, past-deadline bounties.
CREATE INDEX "idx_bounties_expiry_pending"
  ON "bounties" ("status", "environment", "deadline")
  WHERE "expiry_notified_at" IS NULL;
