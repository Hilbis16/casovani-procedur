import Link from 'next/link'
import { getBillingPageData } from '@/modules/scheduling/actions/billingActions'
import { BillingActions } from '@/modules/scheduling/components/BillingActions'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'

export const dynamic = 'force-dynamic'

const CZECH_MONTHS = [
  '',
  'Leden',
  'Únor',
  'Březen',
  'Duben',
  'Květen',
  'Červen',
  'Červenec',
  'Srpen',
  'Září',
  'Říjen',
  'Listopad',
  'Prosinec',
]

const STATUS_LABELS: Record<string, string> = {
  completed: 'Absolvováno',
  no_show: 'Nedostavil se',
  cancelled: 'Zrušeno',
  planned: 'Naplánováno',
  confirmed: 'Potvrzeno',
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  planned: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-indigo-50 text-indigo-700',
}

export default async function VykazPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams
  const now = new Date()
  const year = yearStr ? parseInt(yearStr) : now.getFullYear()
  const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1

  const { period, billable, billed } = await getBillingPageData(year, month)

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }

  const totalDuration = (schedules: typeof billed) =>
    schedules.reduce((sum, s) => sum + s.procedure.durationMin, 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Výkaz pro pojišťovnu</h1>
          <p className="text-gray-500 text-sm mt-1">
            {CZECH_MONTHS[month]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/vykaz?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            ← Předchozí
          </Link>
          <Link
            href={`/vykaz?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Následující →
          </Link>
        </div>
      </div>

      {/* Stats + Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">K vykázání</span>
            <span className="ml-2 font-semibold text-gray-900">{billable.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Vykázáno</span>
            <span className="ml-2 font-semibold text-gray-900">{billed.length}</span>
          </div>
          {billed.length > 0 && (
            <div>
              <span className="text-gray-500">Celkem minut</span>
              <span className="ml-2 font-semibold text-gray-900">{totalDuration(billed)}</span>
            </div>
          )}
        </div>
        <BillingActions
          year={year}
          month={month}
          periodStatus={period?.status ?? null}
          billableCount={billable.length}
        />
      </div>

      {/* K vykázání */}
      {billable.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            K vykázání ({billable.length})
          </h2>
          <BillingTable schedules={billable} />
        </section>
      )}

      {/* Vykázáno */}
      {billed.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Vykázáno ({billed.length})
          </h2>
          <BillingTable schedules={billed} showBilledAt />
        </section>
      ) : (
        billable.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <p className="text-gray-500 text-sm">
              Žádné dokončené procedury v {CZECH_MONTHS[month].toLowerCase()} {year}.
            </p>
          </div>
        )
      )}
    </div>
  )
}

type Schedule = {
  id: string
  date: Date
  startTime: string
  status: string
  billedAt?: Date | null
  patient: { firstName: string; lastName: string }
  procedure: { name: string; durationMin: number; insuranceCode?: string | null }
  therapist: { firstName: string; lastName: string }
}

function BillingTable({
  schedules,
  showBilledAt = false,
}: {
  schedules: Schedule[]
  showBilledAt?: boolean
}) {
  const STATUS_LABELS: Record<string, string> = {
    completed: 'Absolvováno',
    no_show: 'Nedostavil se',
    cancelled: 'Zrušeno',
    planned: 'Naplánováno',
    confirmed: 'Potvrzeno',
  }

  const STATUS_COLORS: Record<string, string> = {
    completed: 'bg-green-50 text-green-700',
    no_show: 'bg-red-50 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    planned: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-indigo-50 text-indigo-700',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Datum
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Pacient
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Procedura
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Kód pojišťovny
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Terapeut
            </th>
            <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
              Min
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Stav
            </th>
            {showBilledAt && (
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                Vykázáno
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5 font-mono text-xs">
                {s.date.toISOString().slice(0, 10)}
                <span className="ml-1 text-gray-400">{s.startTime}</span>
              </td>
              <td className="px-4 py-2.5 font-medium">
                {s.patient.lastName} {s.patient.firstName}
              </td>
              <td className="px-4 py-2.5">{s.procedure.name}</td>
              <td className="px-4 py-2.5">
                {s.procedure.insuranceCode ? (
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                    {s.procedure.insuranceCode}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-gray-600">
                {s.therapist.lastName} {s.therapist.firstName}
              </td>
              <td className="px-4 py-2.5 text-center text-gray-600">{s.procedure.durationMin}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-500'}`}
                >
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </td>
              {showBilledAt && (
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {s.billedAt?.toISOString().slice(0, 10) ?? '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
