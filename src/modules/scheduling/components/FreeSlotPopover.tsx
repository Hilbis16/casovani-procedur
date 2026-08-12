'use client'

import { useEffect, useState } from 'react'
import type { Procedure, Therapist } from '@prisma/client'
import { getFreeSlotSuggestions } from '@/modules/scheduling/actions/prescriptionActions'
import type { ProposalSlot } from '@/modules/scheduling/actions/prescriptionActions'
import { formatDateParam, formatCzechFull } from '@/modules/core/lib/dateUtils'

interface Props {
  stayId: string
  slot: ProposalSlot
  procedures: Procedure[]
  therapists: Therapist[]
  onCancel: () => void
  onConfirm: (newDate: string, newTime: string, newTherapistId: string) => void
}

interface FetchState {
  loading: boolean
  slots: { startTime: string }[]
  error: string
}

export function FreeSlotPopover({
  stayId,
  slot,
  procedures,
  therapists,
  onCancel,
  onConfirm,
}: Props) {
  const [date, setDate] = useState(formatDateParam(slot.date))
  const [therapistId, setTherapistId] = useState(slot.therapistId)
  const [fetch, setFetch] = useState<FetchState>({ loading: true, slots: [], error: '' })

  const procedure = procedures.find((p) => p.id === slot.procedureId)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await getFreeSlotSuggestions({
        stayId,
        procedureId: slot.procedureId,
        therapistId,
        date,
      })
      if (cancelled) return
      setFetch({
        loading: false,
        slots: res.slots,
        error: res.error ?? '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [stayId, slot.procedureId, therapistId, date])

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b">
          <h3 className="font-semibold">Přesunout termín</h3>
          <p className="text-xs text-gray-500 mt-1">
            {procedure?.name} · původně {formatCzechFull(slot.date)} {slot.startTime}
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Terapeut</label>
            <select
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Volné sloty</label>
            {fetch.loading ? (
              <div className="text-sm text-gray-500 italic py-3">Hledám...</div>
            ) : fetch.error ? (
              <div className="text-sm text-red-600">{fetch.error}</div>
            ) : fetch.slots.length === 0 ? (
              <div className="text-sm text-gray-500 italic py-3">
                Žádné volné sloty pro tento den a terapeuta.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fetch.slots.map((s) => (
                  <button
                    key={s.startTime}
                    type="button"
                    onClick={() => onConfirm(date, s.startTime, therapistId)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded border border-blue-200 transition-colors"
                  >
                    {s.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zrušit
          </button>
        </div>
      </div>
    </div>
  )
}
