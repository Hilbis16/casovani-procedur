import { getAuditLogs } from '@\/modules\/core\/actions\/adminActions'

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? '1', 10))
  const { items, total } = await getAuditLogs(pageNum, 50)
  const totalPages = Math.ceil(total / 50)

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit log</h1>
      <p className="text-sm text-gray-500 mb-4">
        Celkem {total} záznamů · strana {pageNum} / {totalPages || 1}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-3 py-2 font-medium">Čas</th>
              <th className="px-3 py-2 font-medium">Uživatel</th>
              <th className="px-3 py-2 font-medium">Akce</th>
              <th className="px-3 py-2 font-medium">Entita</th>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={String(log.id)} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                  {new Date(log.occurredAt).toLocaleString('cs-CZ')}
                </td>
                <td className="px-3 py-2">{log.actor?.email ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                <td className="px-3 py-2">{log.entity}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-400">{log.entityId ?? '—'}</td>
                <td className="px-3 py-2 text-gray-400 text-xs">{log.actorIp ?? '—'}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  Žádné záznamy
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {pageNum > 1 && (
            <a
              href={`?page=${pageNum - 1}`}
              className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
            >
              ← Předchozí
            </a>
          )}
          {pageNum < totalPages && (
            <a
              href={`?page=${pageNum + 1}`}
              className="px-3 py-1 rounded border text-sm hover:bg-gray-50"
            >
              Další →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
