-- CreateIndex
CREATE UNIQUE INDEX "idx_pr_claims_bounty_pr" ON "pr_claims"("bounty_id", "pr_number");
