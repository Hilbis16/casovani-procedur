-- DropForeignKey
ALTER TABLE "procedure_schedules" DROP CONSTRAINT "procedure_schedules_stayId_fkey";

-- AlterTable
ALTER TABLE "procedure_schedules" ALTER COLUMN "stayId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "procedure_schedules" ADD CONSTRAINT "procedure_schedules_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "stays"("id") ON DELETE SET NULL ON UPDATE CASCADE;
