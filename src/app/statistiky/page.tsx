import Link from 'next/link'
import { getCapacityStats } from '@/modules/scheduling/actions/statsActions'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'
import { DAY_NAMES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

function getPeriodRange(period: string, now: Date): { from: Date; to: Date; label: string } {
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()

  if (period === 'month') {
    return {
      from: new Date(Date.UTC(y, m, 1)),
      to: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      label: new Date(Date.UTC(y, m, 1)).toLocaleString('cs', { month: 'long', year: 'numeric' }),
    }
  }
  if (period === 'prevmonth') {
    return {
      from: new Date(Date.UTC(y, m - 1, 1)),
      to: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
      label:
        new Date(Date.UTC(y, m - 1, 1)).toLocaleString('cs', { month: 'long', year: 'numeric' }) +
        ' (minulý)',
    }
  }
  // default: current week Mon–Sun
  const dow = now.getUTCDay()
  const diff = dow === 0 ? -6 : 1 - dow
  const mon = new Date(now)
  mon.setUTCDate(now.getUTCDate() + diff)
  mon.setUTCHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setUTCDate(mon.getUTCDate() + 6)
  sun.setUTCHours(23, 59, 59, 999)
  return { from: mon, to: sun, label: `Týden ${formatCzechFull(mon)} – ${formatCzechFull(sun)}` }
}

export default async function StatistikyPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = 'week' } = await searchParams
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)

  const { from, to, label } = getPeriodRange(period, now)
  const { therapistStats, categoryStats, dailyStats, kpis } = await getCapacityStats(from, to)

  const maxDayCount = Math.max(...dailyStats.map((d) => d.count), 1)
  const maxCatCount = Math.max(...categoryStats.map((c) => c.count), 1)

  const PERIOD_TABS = [
    { key: 'week', label: 'Tento týden' },
    { key: 'month', label: 'Tento měsíc' },
    { key: 'prevmonth', label: 'Minulý měsíc' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiky vytíženosti</h1>
          <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
          {PERIOD_TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/statistiky?period=${tab.key}`}
              className={`px-4 py-2 transition-colors border-r border-gray-200 last:border-r-0 ${
                period === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPI karty */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Procedury celkem" value={String(kpis.totalSchedules)} />
        <KpiCard label="Unikátní pacienti" value={String(kpis.uniquePatients)} />
        <KpiCard
          label="Průměrné vytížení"
          value={kpis.avgOccupancyPct !== null ? `${kpis.avgOccupancyPct} %` : '—'}
          subtext={kpis.avgOccupancyPct !== null ? occupancyLabel(kpis.avgOccupancyPct) : ''}
          color={kpis.avgOccupancyPct !== null ? occupancyColor(kpis.avgOccupancyPct) : ''}
        />
        <KpiCard
          label="Míra nedostavení"
          value={`${kpis.noShowRate} %`}
          subtext={kpis.noShowRate > 10 ? 'Nad normálem' : 'V normě'}
          color={kpis.noShowRate > 10 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* Denní heatmapa */}
      {dailyStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Procedury po dnech</h2>
          <div className="flex flex-wrap gap-1.5">
            {dailyStats.map((d) => {
              const intensity = d.count === 0 ? 0 : Math.ceil((d.count / maxDayCount) * 4)
              const bgClass = [
                'bg-gray-100',
                'bg-blue-100',
                'bg-blue-200',
                'bg-blue-400',
                'bg-blue-600',
              ][intensity]
              const textColor = intensity >= 3 ? 'text-white' : 'text-gray-700'
              const isWeekend = d.dow === 0 || d.dow === 6
              return (
                <div
                  key={d.dateStr}
                  title={`${d.dateStr} (${DAY_NAMES[d.dow]}): ${d.count} procedur`}
                  className={`flex flex-col items-center justify-center rounded w-10 h-10 text-xs font-medium transition-colors ${bgClass} ${textColor} ${isWeekend ? 'opacity-60' : ''}`}
                >
                  <span className="text-[10px] leading-none opacity-75">{DAY_NAMES[d.dow]}</span>
                  <span className="font-bold">{d.count}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span>Méně</span>
            {['bg-gray-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600'].map(
              (c) => (
                <div key={c} className={`w-4 h-4 rounded ${c}`} />
              )
            )}
            <span>Více</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vytíženost terapeutů */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Vytíženost terapeutů</h2>
          </div>
          {therapistStats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              Žádná data pro toto období
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Terapeut
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-36">
                    Vytížení
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Procedury
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Hotovo
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Nedostavení
                  </th>
                </tr>
              </thead>
              <tbody>
                {therapistStats
                  .sort((a, b) => (b.occupancyPct ?? 0) - (a.occupancyPct ?? 0))
                  .map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="font-medium text-gray-900">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {t.occupancyPct !== null ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-semibold ${occupancyColor(t.occupancyPct)}`}>
                                {t.occupancyPct} %
                              </span>
                              <span className="text-gray-400">
                                {Math.round(t.scheduledMinutes / 60)}h /&nbsp;
                                {Math.round(t.availableMinutes / 60)}h
                              </span>
                            </div>
                            <div className="relative bg-gray-100 rounded-full h-1.5 w-full overflow-hidden">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-full transition-all ${occupancyBg(t.occupancyPct)}`}
                                style={{ width: `${t.occupancyPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">bez dostupnosti</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        {t.totalCount}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {t.completedCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.noShowCount > 0 ? (
                          <span className="text-red-600 font-medium">{t.noShowCount}</span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Kategorie procedur */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Typy procedur</h2>
          </div>
          {categoryStats.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">
              Žádná data pro toto období
            </p>
          ) : (
            <div className="p-4 space-y-3">
              {categoryStats.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{c.label}</span>
                    <span className="text-gray-500">
                      {c.count}× · {Math.round(c.minutes / 60)} h
                    </span>
                  </div>
                  <div className="relative bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.round((c.count / maxCatCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string
  value: string
  subtext?: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtext && <p className={`text-xs mt-0.5 font-medium ${color}`}>{subtext}</p>}
    </div>
  )
}

function occupancyColor(pct: number): string {
  if (pct >= 80) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-500'
}

function occupancyBg(pct: number): string {
  if (pct >= 80) return 'bg-green-500'
  if (pct >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

function occupancyLabel(pct: number): string {
  if (pct >= 80) return 'Optimální'
  if (pct >= 50) return 'Průměrné'
  return 'Nízké'
}
