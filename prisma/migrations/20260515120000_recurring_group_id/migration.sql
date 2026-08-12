-- SE-5: Recurring series group operations
-- Add recurringGroupId to link schedules created by one createRecurringSchedules call

ALTER TABLE "procedure_schedules" ADD COLUMN "recurring_group_id" TEXT;

CREATE INDEX "procedure_schedules_recurring_group_id_idx"
  ON "procedure_schedules"("recurring_group_id");
