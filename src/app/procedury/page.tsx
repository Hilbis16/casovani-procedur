import Link from "next/link";
import { getAllProcedures } from "@/actions/procedureActions";
import { CATEGORIES } from "@/lib/constants";

export default async function ProceduresPage() {
  const procedures = await getAllProcedures();

  const grouped = Object.entries(CATEGORIES).map(([key, label]) => ({
    key,
    label,
    items: procedures.filter((p) => p.category === key),
  })).filter((g) => g.items.length > 0);

  const uncategorized = procedures.filter((p) => !CATEGORIES[p.category]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Procedury</h1>
        <Link
          href="/procedury/nova"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nová procedura
        </Link>
      </div>

      <div className="space-y-6">
        {grouped.map((g) => (
          <div key={g.key}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{g.label}</h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <tbody>
                  {g.items.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {p.description && (
                          <span className="ml-2 text-sm text-gray-400">{p.description}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{p.durationMin} min</td>
                      <td className="px-4 py-3 text-sm">
                        {p.building && (
                          <span className="text-gray-800 font-semibold">{p.building}</span>
                        )}
                        {p.building && p.room && <span className="mx-1 text-gray-400">·</span>}
                        {p.room && <span className="text-gray-700 font-medium">{p.room}</span>}
                        {!p.building && !p.room && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {p.isActive ? "Aktivní" : "Neaktivní"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/procedury/${p.id}/upravit`} className="text-blue-600 text-sm hover:underline">
                          Upravit →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {procedures.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center text-gray-400">
            <p className="text-lg">Žádné procedury</p>
            <Link href="/procedury/nova" className="mt-2 text-blue-600 text-sm hover:underline block">
              Přidat první proceduru →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
