import { Suspense } from "react";
import Link from "next/link";
import { getWeekSchedules } from "@/actions/scheduleActions";
import { getPatients } from "@/actions/patientActions";
import { getTherapists } from "@/actions/therapistActions";
import { getProcedures } from "@/actions/procedureActions";
import { WeeklyGrid } from "@/components/scheduling/WeeklyGrid";
import { WeekSelector } from "@/components/scheduling/WeekSelector";
import { getWeekDays, parseWeekParam } from "@/lib/dateUtils";

export default async function PlanovaniPage({
  searchParams,
}: {
  searchParams: Promise<{ tyden?: string }>;
}) {
  const params = await searchParams;
  const weekStart = parseWeekParam(params.tyden ?? null);
  const weekDays = getWeekDays(weekStart);

  const [schedules, patients, therapists, procedures] = await Promise.all([
    getWeekSchedules(weekStart),
    getPatients(),
    getTherapists(),
    getProcedures(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plánování procedur</h1>
        <div className="flex items-center gap-3">
          <WeekSelector weekStart={weekStart} baseHref="/planovani" />
        </div>
      </div>

      <Suspense fallback={<div className="h-96 bg-white rounded-xl animate-pulse" />}>
        <WeeklyGrid
          weekDays={weekDays}
          schedules={schedules}
          patients={patients}
          therapists={therapists}
          procedures={procedures}
        />
      </Suspense>
    </div>
  );
}
