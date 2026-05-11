import { getStays } from '@/modules/hotel/actions/stayActions'
import Link from 'next/link'

export default async function UbytovaniPage() {
  const stays = await getStays()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Správa ubytování</h1>
        <Link
          href="/ubytovani/novy"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nový pobyt
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                Kód
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                Pacient
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                Termín
              </th>
            </tr>
          </thead>
          <tbody>
            {stays.map((stay) => (
              <tr key={stay.id} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3 text-sm">{stay.code}</td>
                <td className="px-4 py-3 text-sm">
                  {stay.patient.lastName} {stay.patient.firstName}
                </td>
                <td className="px-4 py-3 text-sm">
                  {stay.arrivalDate.toLocaleDateString()} -{' '}
                  {stay.departureDate.toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
