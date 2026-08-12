import Link from 'next/link'
import { getPatients } from '@/modules/core/actions/patientActions'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'

export default async function PacientiPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const patients = await getPatients(q)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pacienti</h1>
        <Link
          href="/pacienti/novy"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nový pacient
        </Link>
      </div>

      <form className="mb-4">
        <input
          name="q"
          defaultValue={q}
          placeholder="Hledat podle jména..."
          className="w-full max-w-md border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {patients.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="text-5xl mb-4">👤</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {q ? `Žádní pacienti pro "${q}"` : 'Zatím tu nejsou žádní pacienti'}
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              {q
                ? 'Zkuste hledání zúžit nebo upravit.'
                : 'Začněte zaevidováním prvního pacienta. K němu pak můžete přidat pobyt a naplánovat procedury.'}
            </p>
            <Link
              href="/pacienti/novy"
              className="inline-block px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Přidat pacienta
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Jméno
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Příjezd
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Odjezd
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Stav
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => {
                const stay = p.stays[0]
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="p-0">
                      <Link
                        href={`/pacienti/${p.id}/pobyt`}
                        className="block px-4 py-3 font-medium text-gray-900"
                      >
                        {p.lastName} {p.firstName}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/pacienti/${p.id}/pobyt`}
                        className="block px-4 py-3 text-gray-600"
                      >
                        {stay ? formatCzechFull(new Date(stay.arrivalDate)) : '—'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link
                        href={`/pacienti/${p.id}/pobyt`}
                        className="block px-4 py-3 text-gray-600"
                      >
                        {stay ? formatCzechFull(new Date(stay.departureDate)) : '—'}
                      </Link>
                    </td>
                    <td className="p-0">
                      <Link href={`/pacienti/${p.id}/pobyt`} className="block px-4 py-3">
                        {stay ? (
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              stay.status === 'checked_in'
                                ? 'bg-green-50 text-green-700'
                                : stay.status === 'planned'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {stay.status === 'checked_in'
                              ? 'Ubytován'
                              : stay.status === 'planned'
                                ? 'Plánovaný'
                                : stay.status}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">bez pobytu</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/pacienti/${p.id}/upravit`}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        Upravit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
