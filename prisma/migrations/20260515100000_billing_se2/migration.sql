-- SE-2: Billing / Výkaz pro pojišťovnu

-- BillingPeriod table
CREATE TABLE "billing_periods" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_periods_year_month_key" ON "billing_periods"("year", "month");

-- Add billing fields to ProcedureSchedule
ALTER TABLE "procedure_schedules"
    ADD COLUMN "billedAt" TIMESTAMP(3),
    ADD COLUMN "billingPeriodId" TEXT;

CREATE INDEX "procedure_schedules_billingPeriodId_idx" ON "procedure_schedules"("billingPeriodId");

ALTER TABLE "procedure_schedules"
    ADD CONSTRAINT "procedure_schedules_billingPeriodId_fkey"
    FOREIGN KEY ("billingPeriodId") REFERENCES "billing_periods"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add insuranceCode to Procedure
ALTER TABLE "procedures" ADD COLUMN "insuranceCode" TEXT;
