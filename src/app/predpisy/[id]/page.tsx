import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

import { checkPermission } from '@/modules/core/rbac'
import { getPrescription } from '@/modules/scheduling/actions/prescriptionActions'
import { CancelPrescriptionButton } from '@/modules/scheduling/components/CancelPrescriptionButton'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  planned: { text: 'Plánováno', className: 'bg-blue-50 text-blue-700' },
  confirmed: { text: 'Potvrzeno', className: 'bg-indigo-50 text-indigo-700' },
  completed: { text: 'Hotovo', className: 'bg-green-50 text-green-700' },
  cancelled: { text: 'Zrušeno', className: 'bg-gray-100 text-gray-500 line-through' },
  no_show: { text: 'Nedostavil se', className: 'bg-amber-50 text-amber-700' },
}

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const deny = await checkPermission('prescription.read')
  if (deny) redirect('/')

  const { id } = await params
  const prescription = await getPrescription(id)
  if (!prescription) notFound()

  const canWrite = (await checkPermission('prescription.write')) === null
  const totalRequested = prescription.items.reduce((acc, it) => acc + it.repetitions, 0)
  const totalCreated = prescription.items.reduce((acc, it) => acc + it.createdSchedulesCount, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link href="/predpisy" className="text-gray-400 hover:text-gray-600 text-sm">
          ← Zpět na předpisy
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Předpis · {prescription.patient.lastName} {prescription.patient.firstName}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pobyt {prescription.stay.code} ·{' '}
            {formatCzechFull(new Date(prescription.stay.arrivalDate))} –{' '}
            {formatCzechFull(new Date(prescription.stay.departureDate))}
          </p>
          <p className="text-gray-500 text-sm">
            Lékař: {prescription.doctor.fullName} · vytvořeno{' '}
            {formatCzechFull(new Date(prescription.createdAt))}
            {prescription.template && (
              <>
                {' '}
                · šablona <strong>{prescription.template.name}</strong>
              </>
            )}
          </p>
          {prescription.notes && (
            <p className="text-amber-700 text-sm mt-2 bg-amber-50 px-3 py-2 rounded-lg">
              📋 {prescription.notes}
            </p>
          )}
        </div>
        {canWrite && <CancelPrescriptionButton prescriptionId={prescription.id} />}
      </div>

      <div className="bg-white border rounded-xl px-4 py-3 mb-6 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          Celkem <strong className="text-gray-900">{totalCreated}</strong> /{' '}
          <span className="text-gray-400">{totalRequested}</span> procedur naplánováno
        </div>
        <Link
          href={`/pacienti/${prescription.patientId}`}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Karta pacienta →
        </Link>
      </div>

      <div className="space-y-6">
        {prescription.items.map((item) => (
          <div key={item.id} className="bg-white border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{item.procedure.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.procedure.durationMin} min ·{' '}
                  {item.therapist
                    ? `${item.therapist.lastName} ${item.therapist.firstName}`
                    : 'neurčen'}{' '}
                  · pref. čas {item.preferredTime}
                </div>
              </div>
              <div className="text-right">
                <div className="tabular-nums">
                  <span className="font-medium text-gray-900">{item.createdSchedulesCount}</span>
                  <span className="text-gray-400"> / {item.repetitions}</span>
                </div>
                <div className="text-xs text-gray-500">naplánováno / požadováno</div>
              </div>
            </div>

            {item.schedules.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left px-4 py-2">Datum</th>
                    <th className="text-left px-4 py-2">Čas</th>
                    <th className="text-left px-4 py-2">Terapeut</th>
                    <th className="text-left px-4 py-2">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {item.schedules.map((s) => {
                    const status = STATUS_LABELS[s.status] ?? {
                      text: s.status,
                      className: 'bg-gray-100 text-gray-600',
                    }
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-2">{formatCzechFull(new Date(s.date))}</td>
                        <td className="px-4 py-2 font-mono text-gray-700">
                          {s.startTime}–{s.endTime}
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {s.therapist.lastName} {s.therapist.firstName}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
                          >
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-6 text-sm text-gray-400 italic text-center">
                Žádné naplánované procedury (možná všechny v konfliktu při tvorbě).
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
