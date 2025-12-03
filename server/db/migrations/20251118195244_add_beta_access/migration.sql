-- CreateTable
CREATE TABLE "beta_access" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "github_username" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "applied_at" BIGINT NOT NULL,
    "reviewed_at" BIGINT,
    "reviewed_by" BIGINT,

    CONSTRAINT "beta_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_access_github_id_key" ON "beta_access"("github_id");

-- CreateIndex
CREATE INDEX "idx_beta_access_status" ON "beta_access"("status");

-- CreateIndex
CREATE INDEX "idx_beta_access_github" ON "beta_access"("github_id");

