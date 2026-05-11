import { notFound } from 'next/navigation'
import Link from 'next/link'
import { addDays } from 'date-fns'
import { getPatient } from '@/actions/patientActions'
import { getPatientStaySchedules } from '@/actions/scheduleActions'
import { PrintButton } from '@/components/print/PrintButton'
import { formatCzechFull, sameDay } from '@/lib/dateUtils'

const STATUS_LABELS: Record<string, string> = {
  planned: 'naplánováno',
  completed: 'absolvováno',
  cancelled: 'zrušeno',
}

export default async function TiskPacientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const patient = await getPatient(id)
  if (!patient) notFound()

  const stay = patient.stays[0]
  if (!stay) notFound()

  const from = new Date(stay.arrivalDate)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(stay.departureDate)
  to.setUTCHours(0, 0, 0, 0)

  const schedules = await getPatientStaySchedules(patient.id, from, to)

  const days: Date[] = []
  let cur = new Date(from)
  while (cur <= to) {
    days.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  const daySchedules = (day: Date) => schedules.filter((s) => sameDay(new Date(s.date), day))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link
          href={`/pacienti/${patient.id}/pobyt`}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Zpět
        </Link>
        <PrintButton />
      </div>

      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rozvrh procedur</h1>
        <p className="text-lg font-semibold text-gray-800 mt-1">
          {patient.lastName} {patient.firstName}
        </p>
        <p className="text-gray-600 text-sm mt-1">
          Pobyt: {formatCzechFull(from)} – {formatCzechFull(to)}
        </p>
        {patient.note && <p className="text-gray-600 text-sm mt-1">Poznámka: {patient.note}</p>}
      </div>

      <div className="space-y-4">
        {days.map((day) => {
          const ds = daySchedules(day)
          if (ds.length === 0) return null
          return (
            <div key={day.toISOString()}>
              <h2 className="font-semibold text-gray-800 text-sm border-b border-gray-200 pb-1 mb-2">
                {formatCzechFull(day)}
              </h2>
              <table className="w-full text-sm">
                <tbody>
                  {ds.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 pr-4 font-mono text-xs font-semibold w-20">
                        {s.startTime} – {s.endTime}
                      </td>
                      <td className="py-1.5 pr-4 font-medium">{s.procedure.name}</td>
                      <td className="py-1.5 pr-4 text-gray-600">
                        {s.therapist.lastName} {s.therapist.firstName}
                      </td>
                      <td className="py-1.5 pr-4 text-gray-600 text-xs">
                        {[s.procedure.building, s.procedure.room].filter(Boolean).join(' · ') ||
                          '—'}
                      </td>
                      <td className="py-1.5 text-gray-400 text-xs">
                        {STATUS_LABELS[s.status] ?? s.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {schedules.length === 0 && (
          <p className="text-gray-400 italic text-sm">Žádné procedury naplánovány.</p>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 print:hidden">
        Celkem {schedules.length} procedur
      </div>
    </div>
  )
}
