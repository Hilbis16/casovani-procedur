import Link from 'next/link'
import { redirect } from 'next/navigation'
import { checkPermission } from '@/modules/core/rbac'

export const dynamic = 'force-dynamic'

import { getPrescriptions } from '@/modules/scheduling/actions/prescriptionActions'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'

export default async function PredpisyPage() {
  const deny = await checkPermission('prescription.read')
  if (deny) redirect('/')

  const prescriptions = await getPrescriptions()

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Předpisy</h1>
          <p className="text-gray-500 text-sm mt-1">Lékařské předpisy a navázané procedury.</p>
        </div>
        <Link
          href="/pacienti"
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          + Nový předpis
        </Link>
      </div>

      {prescriptions.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <p className="text-gray-500">Zatím žádné předpisy.</p>
          <p className="text-xs text-gray-400 mt-2">
            Vytvořte první z karty pacienta s aktivním pobytem.
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Pacient</th>
                <th className="text-left px-4 py-3">Pobyt</th>
                <th className="text-left px-4 py-3">Šablona</th>
                <th className="text-left px-4 py-3">Lékař</th>
                <th className="text-right px-4 py-3">Procedury</th>
                <th className="text-left px-4 py-3">Vytvořeno</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prescriptions.map((p) => {
                const totalCreated = p.items.reduce((acc, it) => acc + it.createdSchedulesCount, 0)
                const totalRequested = p.items.reduce((acc, it) => acc + it.repetitions, 0)
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {p.patient.lastName} {p.patient.firstName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{p.stay.code}</div>
                      <div className="text-xs text-gray-400">
                        {formatCzechFull(new Date(p.stay.arrivalDate))} –{' '}
                        {formatCzechFull(new Date(p.stay.departureDate))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.template?.name ?? <span className="text-gray-400 italic">ručně</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.doctor.fullName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-medium text-gray-900">{totalCreated}</span>
                      <span className="text-gray-400"> / {totalRequested}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCzechFull(new Date(p.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/predpisy/${p.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
