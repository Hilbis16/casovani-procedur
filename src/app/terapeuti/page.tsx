import Link from 'next/link'
import {
  getAllTherapists,
  toggleTherapistActive,
} from '@/modules/scheduling/actions/therapistActions'

export default async function TerapeutiPage() {
  const therapists = await getAllTherapists()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Terapeuti</h1>
        <Link
          href="/terapeuti/novy"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nový terapeut
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {therapists.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="text-5xl mb-4">🧑‍⚕️</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              Zatím tu nejsou žádní terapeuti
            </h2>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Přidejte terapeuta, přiřaďte mu pracovní hodiny a barvu v kalendáři. Pak mu bude možné
              přidělovat procedury.
            </p>
            <Link
              href="/terapeuti/novy"
              className="inline-block px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Přidat terapeuta
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
                  Telefon
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Stav
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {therapists.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-medium text-gray-900">
                        {t.lastName} {t.firstName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {t.isActive ? 'Aktivní' : 'Neaktivní'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/terapeuti/${t.id}`}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
