import Link from 'next/link'
import { addDays, parseISO } from 'date-fns'
import { getDaySchedules } from '@/actions/scheduleActions'
import { getTherapists } from '@/actions/therapistActions'
import { PrintButton } from '@/components/print/PrintButton'
import { formatCzechFull, formatDateParam } from '@/lib/dateUtils'

export default async function PrehledPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>
}) {
  const { datum } = await searchParams

  const date = datum ? parseISO(datum) : new Date()
  date.setUTCHours(0, 0, 0, 0)

  const [schedules, therapists] = await Promise.all([getDaySchedules(date), getTherapists()])

  const prevDay = formatDateParam(addDays(date, -1))
  const nextDay = formatDateParam(addDays(date, 1))

  const byTherapist = therapists
    .map((t) => ({
      therapist: t,
      schedules: schedules
        .filter((s) => s.therapistId === t.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))
    .filter((t) => t.schedules.length > 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Denní přehled</h1>
          <p className="text-gray-500 text-sm mt-1">{formatCzechFull(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/prehled?datum=${prevDay}`}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            ← Předchozí den
          </Link>
          <Link
            href={`/prehled?datum=${nextDay}`}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Následující den →
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Denní přehled procedur</h1>
        <p className="text-gray-600">{formatCzechFull(date)}</p>
      </div>

      {byTherapist.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">Žádné procedury pro {formatCzechFull(date)}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byTherapist.map(({ therapist, schedules: ts }) => (
            <div key={therapist.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="px-4 py-2.5 font-semibold text-white text-sm"
                style={{ backgroundColor: therapist.color }}
              >
                {therapist.lastName} {therapist.firstName}
                <span className="ml-2 font-normal opacity-80 text-xs">
                  ({ts.length}{' '}
                  {ts.length === 1 ? 'pacient' : ts.length < 5 ? 'pacienti' : 'pacientů'})
                </span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-32">
                      Čas
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Procedura
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Pacient
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20">
                      Pokoj
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24 print:hidden">
                      Poznámka
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ts.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold">
                        {s.startTime} – {s.endTime}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{s.procedure.name}</td>
                      <td className="px-4 py-2.5">
                        {s.patient.lastName} {s.patient.firstName}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">—</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs print:hidden">
                        {s.note ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
