'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createBatchSchedules } from '@/modules/scheduling/actions/scheduleActions'
import type { Patient, Stay, Therapist, Procedure } from '@prisma/client'

const PREFERRED_TIMES = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
]

interface PlanItem {
  procedureId: string
  therapistId: string
  count: string
  preferredTime: string
}

interface Props {
  patient: Patient
  stay: Stay
  procedures: Procedure[]
  therapists: Therapist[]
  onClose: () => void
  onSuccess: () => void
}

export function StaySchedulePlanner({
  patient,
  stay,
  procedures,
  therapists,
  onClose,
  onSuccess,
}: Props) {
  const [items, setItems] = useState<PlanItem[]>([
    { procedureId: '', therapistId: '', count: '3', preferredTime: '09:00' },
  ])
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function updateItem(index: number, field: keyof PlanItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [field]: value }
        if (field === 'procedureId' && value && !next.therapistId && therapists[0]) {
          next.therapistId = therapists[0].id
        }
        return next
      })
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { procedureId: '', therapistId: '', count: '3', preferredTime: '09:00' },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSchedule() {
    const valid = items.filter(
      (item) => item.procedureId && item.therapistId && Number(item.count) > 0
    )
    if (valid.length === 0) {
      setError('Vyberte alespoň jednu proceduru s terapeutem.')
      return
    }
    setError('')
    setResult(null)
    startTransition(async () => {
      const res = await createBatchSchedules({
        patientId: patient.id,
        stayId: stay.id,
        items: valid.map((item) => ({
          procedureId: item.procedureId,
          therapistId: item.therapistId,
          count: Number(item.count),
          preferredTime: item.preferredTime,
        })),
      })
      if (res.success) {
        setResult({ created: res.created, skipped: res.skipped })
        toast.success(
          `Naplánováno ${res.created} procedur${res.skipped > 0 ? `, přeskočeno ${res.skipped}` : ''}`
        )
        if (res.created > 0) onSuccess()
      } else {
        const msg = res.error ?? 'Chyba při plánování'
        setError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-lg">Sestavit plán pobytu</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Vyberte procedury a počet opakování za pobyt. Systém je rovnoměrně rozmístí přes
            pracovní dny a přeskočí kolize.
          </p>

          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_72px_100px_32px] gap-2 items-end">
                <div>
                  {i === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Procedura
                    </label>
                  )}
                  <select
                    value={item.procedureId}
                    onChange={(e) => updateItem(i, 'procedureId', e.target.value)}
                    className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— procedura —</option>
                    {procedures.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.durationMin} min)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {i === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">Terapeut</label>
                  )}
                  <select
                    value={item.therapistId}
                    onChange={(e) => updateItem(i, 'therapistId', e.target.value)}
                    className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— terapeut —</option>
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.lastName} {t.firstName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {i === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">Počet</label>
                  )}
                  <input
                    type="number"
                    min={1}
                    value={item.count}
                    onChange={(e) => updateItem(i, 'count', e.target.value)}
                    className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  {i === 0 && (
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Pref. čas
                    </label>
                  )}
                  <select
                    value={item.preferredTime}
                    onChange={(e) => updateItem(i, 'preferredTime', e.target.value)}
                    className="w-full border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PREFERRED_TIMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {i === 0 && <div className="mb-1 h-4" />}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="w-8 h-[38px] flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Přidat proceduru
          </button>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Vytvořeno <strong>{result.created}</strong> procedur
              {result.skipped > 0 && (
                <>
                  , přeskočeno <strong>{result.skipped}</strong> (konflikt nebo kapacita)
                </>
              )}
              .
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zavřít
          </button>
          <button
            type="button"
            onClick={handleSchedule}
            disabled={isPending}
            className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Plánuji...' : 'Naplánovat →'}
          </button>
        </div>
      </div>
    </div>
  )
}
