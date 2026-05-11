import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPatient } from '@/modules/scheduling/actions/patientActions'
import { getPatientStaySchedules } from '@/modules/scheduling/actions/scheduleActions'
import { getTherapists } from '@/modules/scheduling/actions/therapistActions'
import { getProcedures } from '@/modules/scheduling/actions/procedureActions'
import { getPatients } from '@/modules/scheduling/actions/patientActions'
import { StayPlanningView } from '@/modules/scheduling/components/StayPlanningView'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'
import { ExportPatientButton } from '@/modules/core/gdpr/ExportPatientButton'

export default async function PobytPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatient(id)
  if (!patient) notFound()

  const stay = patient.stays[0]
  if (!stay) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/pacienti/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
            ← Zpět na pacienta
          </Link>
        </div>
        <p className="text-gray-500 mt-4">Pacient nemá žádný aktivní pobyt.</p>
      </div>
    )
  }

  const from = new Date(stay.arrivalDate)
  const to = new Date(stay.departureDate)

  const [schedules, therapists, procedures, patients] = await Promise.all([
    getPatientStaySchedules(patient.id, from, to),
    getTherapists(),
    getProcedures(),
    getPatients(),
  ])

  const stayDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/pacienti/${patient.id}`}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Zpět na pacienta
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {patient.lastName} {patient.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pobyt: {formatCzechFull(from)} – {formatCzechFull(to)} ({stayDays} dní)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportPatientButton patientId={id} />
          <Link
            href={`/pacienti/${patient.id}/tisk`}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Tisknout rozvrh →
          </Link>
        </div>
      </div>

      <h2 className="text-base font-semibold text-gray-700 mb-3">
        Plán procedur — celý pobyt ({schedules.length} procedur)
      </h2>

      <StayPlanningView
        patient={patient}
        stay={stay}
        schedules={schedules}
        therapists={therapists}
        procedures={procedures}
        patients={patients}
      />
    </div>
  )
}
