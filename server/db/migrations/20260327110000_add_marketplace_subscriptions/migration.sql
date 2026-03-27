-- CreateTable
CREATE TABLE "marketplace_subscriptions" (
    "id" SERIAL NOT NULL,
    "account_id" BIGINT,
    "account_login" TEXT NOT NULL,
    "account_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "plan_id" INTEGER,
    "plan_name" TEXT,
    "billing_cycle" TEXT,
    "unit_count" INTEGER,
    "on_free_trial" BOOLEAN,
    "free_trial_ends_on" BIGINT,
    "next_billing_date" BIGINT,
    "pending_plan_id" INTEGER,
    "pending_plan_name" TEXT,
    "pending_effective_date" BIGINT,
    "cancelled_at" BIGINT,
    "last_event" TEXT,
    "last_action" TEXT,
    "last_delivery_id" TEXT,
    "last_payload" JSONB,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "marketplace_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_webhook_events" (
    "id" SERIAL NOT NULL,
    "delivery_id" TEXT NOT NULL,
    "github_event" TEXT NOT NULL,
    "action" TEXT,
    "account_id" BIGINT,
    "account_login" TEXT,
    "processed_at" BIGINT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "marketplace_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_subscriptions_account_id_key" ON "marketplace_subscriptions"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_subscriptions_account_login_key" ON "marketplace_subscriptions"("account_login");

-- CreateIndex
CREATE INDEX "idx_marketplace_subscriptions_status" ON "marketplace_subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_marketplace_subscriptions_account_login" ON "marketplace_subscriptions"("account_login");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_webhook_events_delivery_id_key" ON "marketplace_webhook_events"("delivery_id");

-- CreateIndex
CREATE INDEX "idx_marketplace_webhook_events_account_id" ON "marketplace_webhook_events"("account_id");

-- CreateIndex
CREATE INDEX "idx_marketplace_webhook_events_account_login" ON "marketplace_webhook_events"("account_login");
