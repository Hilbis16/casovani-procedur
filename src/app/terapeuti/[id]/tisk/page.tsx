import { notFound } from 'next/navigation'
import Link from 'next/link'
import { parseISO } from 'date-fns'
import { getTherapist } from '@/modules/scheduling/actions/therapistActions'
import { getDaySchedules } from '@/modules/scheduling/actions/scheduleActions'
import { PrintButton } from '@/components/print/PrintButton'
import { formatCzechFull, formatDateParam } from '@/modules/core/lib/dateUtils'
import { DAY_NAMES_FULL } from '@/lib/constants'

export default async function TiskTerapeutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ datum?: string }>
}) {
  const { id } = await params
  const { datum } = await searchParams

  const therapist = await getTherapist(id)
  if (!therapist) notFound()

  const date = datum ? parseISO(datum) : new Date()
  date.setUTCHours(0, 0, 0, 0)

  const allSchedules = await getDaySchedules(date)
  const schedules = allSchedules
    .filter((s) => s.therapistId === id)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const count = schedules.length
  const countLabel = count === 1 ? 'procedura' : count < 5 ? 'procedury' : 'procedur'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link href={`/terapeuti/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět
        </Link>
        <PrintButton />
      </div>

      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Denní plán procedur</h1>
        <p className="text-lg font-semibold text-gray-800 mt-1">
          {therapist.lastName} {therapist.firstName}
        </p>
        <p className="text-gray-600 text-sm mt-1">
          {DAY_NAMES_FULL[date.getUTCDay()]}, {formatCzechFull(date)}
        </p>
      </div>

      {schedules.length === 0 ? (
        <p className="text-gray-400 italic text-sm">Žádné procedury pro tento den.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 text-left font-semibold text-gray-700 w-28">Čas</th>
              <th className="py-2 text-left font-semibold text-gray-700">Procedura</th>
              <th className="py-2 text-left font-semibold text-gray-700">Pacient</th>
              <th className="py-2 text-left font-semibold text-gray-700 w-28">Místo</th>
              <th className="py-2 text-left font-semibold text-gray-700 w-20">Podpis</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-gray-200">
                <td className="py-3 pr-4 font-mono text-xs font-semibold tabular-nums">
                  {s.startTime}–{s.endTime}
                </td>
                <td className="py-3 pr-4 font-medium">{s.procedure.name}</td>
                <td className="py-3 pr-4">
                  {s.patient.lastName} {s.patient.firstName}
                </td>
                <td className="py-3 pr-4 text-gray-500 text-xs">
                  {[s.procedure.building, s.procedure.room].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="py-3 border-b border-dashed border-gray-400" />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-400">
        {count} {countLabel} &nbsp;·&nbsp; Vytištěno {formatCzechFull(new Date())}
      </div>
    </div>
  )
}
