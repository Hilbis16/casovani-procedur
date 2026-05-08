import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatient } from "@/actions/patientActions";
import { getPatientWeekSchedules } from "@/actions/scheduleActions";
import { getTherapists } from "@/actions/therapistActions";
import { getProcedures } from "@/actions/procedureActions";
import { getPatients } from "@/actions/patientActions";
import { WeeklyGrid } from "@/components/scheduling/WeeklyGrid";
import { WeekSelector } from "@/components/scheduling/WeekSelector";
import { getWeekDays, parseWeekParam, formatCzechFull } from "@/lib/dateUtils";

export default async function PacientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tyden?: string }>;
}) {
  const { id } = await params;
  const { tyden } = await searchParams;

  const patient = await getPatient(Number(id));
  if (!patient) notFound();

  const weekStart = parseWeekParam(tyden ?? null);
  const weekDays = getWeekDays(weekStart);

  const [schedules, therapists, procedures, patients] = await Promise.all([
    getPatientWeekSchedules(patient.id, weekStart),
    getTherapists(),
    getProcedures(),
    getPatients(),
  ]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/pacienti" className="text-gray-400 hover:text-gray-600 text-sm">← Zpět</Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.lastName} {patient.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {patient.building ? `${patient.building} · ` : ""}Pokoj {patient.roomNumber} · Pobyt: {formatCzechFull(new Date(patient.arrivalDate))} – {formatCzechFull(new Date(patient.departureDate))}
          </p>
          {patient.note && (
            <p className="text-amber-700 text-sm mt-1 bg-amber-50 px-3 py-1 rounded-lg inline-block">
              📋 {patient.note}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/pacienti/${patient.id}/pobyt`}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Plánovat pobyt
          </Link>
          <Link
            href={`/pacienti/${patient.id}/tisk`}
            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tisknout rozvrh
          </Link>
          <Link
            href={`/pacienti/${patient.id}/upravit`}
            className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upravit
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Týdenní rozvrh procedur</h2>
        <WeekSelector weekStart={weekStart} baseHref={`/pacienti/${patient.id}`} />
      </div>

      <WeeklyGrid
        weekDays={weekDays}
        schedules={schedules}
        patients={patients}
        therapists={therapists}
        procedures={procedures}
        filterPatientId={patient.id}
      />
    </div>
  );
}
