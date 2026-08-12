import Link from 'next/link'
import { addDays, parseISO } from 'date-fns'
import { getDaySchedules } from '@/modules/scheduling/actions/scheduleActions'
import { getTherapists } from '@/modules/scheduling/actions/therapistActions'
import { PrintButton } from '@/components/print/PrintButton'
import { formatCzechFull, formatDateParam, timeToMinutes } from '@/modules/core/lib/dateUtils'
import { DayStats } from '@/modules/scheduling/components/DayStats'
import { StatusButtons } from '@/modules/scheduling/components/StatusButtons'
import { CATEGORIES } from '@/lib/constants'
import type { DayStatsData, TherapistBlock } from '@/modules/scheduling/types/prehled'

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

  const dayOfWeek = date.getUTCDay()

  const blocks: TherapistBlock[] = therapists
    .map((therapist) => {
      const ts = schedules
        .filter((s) => s.therapistId === therapist.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      const avail = therapist.availabilities.find((a) => a.dayOfWeek === dayOfWeek)
      const availableMinutes = avail
        ? timeToMinutes(avail.endTime) - timeToMinutes(avail.startTime)
        : 0
      const scheduledMinutes = ts.reduce(
        (sum, s) => sum + timeToMinutes(s.endTime) - timeToMinutes(s.startTime),
        0
      )
      const occupancyPct =
        availableMinutes > 0
          ? Math.min(100, Math.round((scheduledMinutes / availableMinutes) * 100))
          : null

      return { therapist, schedules: ts, scheduledMinutes, availableMinutes, occupancyPct }
    })
    .filter((b) => b.schedules.length > 0)

  const occupancyValues = blocks.filter((b) => b.occupancyPct !== null).map((b) => b.occupancyPct!)
  const avgOccupancyPct =
    occupancyValues.length > 0
      ? Math.round(occupancyValues.reduce((a, b) => a + b, 0) / occupancyValues.length)
      : null

  const categoryBreakdown = Object.entries(CATEGORIES)
    .map(([key, label]) => ({
      key,
      label,
      count: schedules.filter((s) => s.procedure.category === key).length,
    }))
    .filter((c) => c.count > 0)

  const stats: DayStatsData = {
    totalProcedures: schedules.length,
    uniquePatients: new Set(schedules.map((s) => s.patientId)).size,
    activeTherapists: blocks.length,
    avgOccupancyPct,
    categoryBreakdown,
  }

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

      <DayStats stats={stats} />

      {blocks.length === 0 ? (
        <div className="bg-white border rounded-xl px-6 py-12 text-center mt-6">
          <div className="text-5xl mb-4">📅</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            Žádné procedury pro tento den
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {dayOfWeek === 0 || dayOfWeek === 6
              ? 'Víkend — terapeuti obvykle nepracují.'
              : 'Vypadá to, že na tento den nejsou naplánované procedury.'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Link
              href="/planovani"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Otevřít plánování →
            </Link>
            <Link
              href={`/prehled?datum=${prevDay}`}
              className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Předchozí den
            </Link>
            <Link
              href={`/prehled?datum=${nextDay}`}
              className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Následující den →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {blocks.map(({ therapist, schedules: ts, occupancyPct }) => (
            <div key={therapist.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div
                className="px-4 py-2.5 font-semibold text-white text-sm flex items-center justify-between"
                style={{ backgroundColor: therapist.color }}
              >
                <span>
                  {therapist.lastName} {therapist.firstName}
                  <span className="ml-2 font-normal opacity-80 text-xs">
                    ({ts.length}{' '}
                    {ts.length === 1 ? 'pacient' : ts.length < 5 ? 'pacienti' : 'pacientů'})
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  {occupancyPct !== null && (
                    <span className="print:hidden text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                      {occupancyPct} %
                    </span>
                  )}
                  <Link
                    href={`/terapeuti/${therapist.id}/tisk?datum=${formatDateParam(date)}`}
                    className="text-xs opacity-75 hover:opacity-100 underline print:hidden"
                  >
                    Tisknout
                  </Link>
                </div>
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
                    <th className="px-4 py-2 w-16 print:hidden" />
                  </tr>
                </thead>
                <tbody>
                  {ts.map((s) => {
                    const rowBg =
                      s.status === 'completed'
                        ? 'bg-green-50/40'
                        : s.status === 'no_show'
                          ? 'bg-red-50/40'
                          : ''
                    return (
                      <tr key={s.id} className={rowBg}>
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
                        <td className="px-4 py-2.5 print:hidden">
                          <StatusButtons
                            scheduleId={s.id}
                            currentStatus={s.status}
                            billedAt={s.billedAt}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
