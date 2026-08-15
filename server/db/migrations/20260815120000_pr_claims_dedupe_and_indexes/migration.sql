-- Deduplicate pr_claims, then enforce one claim per (bounty, PR, repo).
--
-- `pull_request.edited` re-runs the PR-open handler, and claim creation was a
-- plain INSERT, so a single pull request accumulated a new claim row on every
-- description edit. Each duplicate was independently payable when the PR merged.
--
-- Existing duplicates must go before the unique index can be created. Keep the
-- lowest id in each group — the original claim — and prefer to keep a row that
-- already reached a settled status, so a recorded payout is never discarded.

DELETE FROM "pr_claims" a
USING "pr_claims" b
WHERE a."bounty_id" = b."bounty_id"
  AND a."pr_number" = b."pr_number"
  AND a."repo_full_name" = b."repo_full_name"
  AND (
    -- b is settled and a is not: drop a.
    (b."status" IN ('paid', 'failed') AND a."status" NOT IN ('paid', 'failed'))
    -- both equally settled (or equally unsettled): drop the later row.
    OR (
      (b."status" IN ('paid', 'failed')) = (a."status" IN ('paid', 'failed'))
      AND b."id" < a."id"
    )
  );

CREATE UNIQUE INDEX "uq_pr_claims_bounty_pr"
  ON "pr_claims" ("bounty_id", "pr_number", "repo_full_name");

-- The payout path resolves claims by (repo_full_name, pr_number) on every
-- merged PR. Without this index that is a sequential scan, run inside GitHub's
-- webhook delivery timeout.
CREATE INDEX "idx_pr_claims_pr"
  ON "pr_claims" ("repo_full_name", "pr_number");

-- Contributor dashboards list claims by author.
CREATE INDEX "idx_pr_claims_author"
  ON "pr_claims" ("pr_author_github_id");
