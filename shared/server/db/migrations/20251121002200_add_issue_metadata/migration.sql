-- Add issue metadata columns if they don't exist yet
ALTER TABLE "bounties"
ADD COLUMN IF NOT EXISTS "issue_title" TEXT;

ALTER TABLE "bounties"
ADD COLUMN IF NOT EXISTS "issue_description" TEXT;

