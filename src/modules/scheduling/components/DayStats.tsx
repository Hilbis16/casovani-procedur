import type { DayStatsData } from '@/modules/scheduling/types/prehled'

interface Props {
  stats: DayStatsData
}

export function DayStats({ stats }: Props) {
  return (
    <div className="print:hidden mb-6 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Procedury dnes" value={String(stats.totalProcedures)} />
        <StatCard label="Pacienti" value={String(stats.uniquePatients)} />
        <StatCard label="Aktivní terapeuti" value={String(stats.activeTherapists)} />
        <StatCard
          label="Průměrné vytížení"
          value={stats.avgOccupancyPct !== null ? `${stats.avgOccupancyPct} %` : '—'}
        />
      </div>
      {stats.categoryBreakdown.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stats.categoryBreakdown.map((c) => (
            <span
              key={c.key}
              className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600"
            >
              {c.label}: <span className="font-semibold text-gray-900">{c.count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
