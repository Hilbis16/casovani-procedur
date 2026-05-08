import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatient } from "@/actions/patientActions";
import { getPatientStaySchedules } from "@/actions/scheduleActions";
import { getTherapists } from "@/actions/therapistActions";
import { getProcedures } from "@/actions/procedureActions";
import { getPatients } from "@/actions/patientActions";
import { StayPlanningView } from "@/components/scheduling/StayPlanningView";
import { formatCzechFull } from "@/lib/dateUtils";

export default async function PobytPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await getPatient(Number(id));
  if (!patient) notFound();

  const from = new Date(patient.arrivalDate);
  const to = new Date(patient.departureDate);

  const [schedules, therapists, procedures, patients] = await Promise.all([
    getPatientStaySchedules(patient.id, from, to),
    getTherapists(),
    getProcedures(),
    getPatients(),
  ]);

  const stayDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href={`/pacienti/${patient.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět na pacienta
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.lastName} {patient.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pokoj {patient.roomNumber} · Pobyt: {formatCzechFull(from)} – {formatCzechFull(to)} ({stayDays} dní)
          </p>
        </div>
        <Link
          href={`/pacienti/${patient.id}/tisk`}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Tisknout rozvrh →
        </Link>
      </div>

      <h2 className="text-base font-semibold text-gray-700 mb-3">
        Plán procedur — celý pobyt ({schedules.length} procedur)
      </h2>

      <StayPlanningView
        patient={patient}
        schedules={schedules}
        therapists={therapists}
        procedures={procedures}
        patients={patients}
      />
    </div>
  );
}
