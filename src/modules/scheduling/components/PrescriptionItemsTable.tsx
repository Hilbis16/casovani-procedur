'use client'

import type { Procedure, Therapist } from '@prisma/client'

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

export interface ItemRow {
  procedureId: string
  therapistId: string
  repetitions: string
  preferredTime: string
}

interface Props {
  items: ItemRow[]
  procedures: Procedure[]
  therapists: Therapist[]
  onChange: (items: ItemRow[]) => void
}

export function PrescriptionItemsTable({ items, procedures, therapists, onChange }: Props) {
  function update(index: number, field: keyof ItemRow, value: string) {
    onChange(
      items.map((it, i) => {
        if (i !== index) return it
        const next = { ...it, [field]: value }
        if (field === 'procedureId' && value && !next.therapistId && therapists[0]) {
          next.therapistId = therapists[0].id
        }
        return next
      })
    )
  }

  function add() {
    onChange([
      ...items,
      { procedureId: '', therapistId: '', repetitions: '3', preferredTime: '09:00' },
    ])
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1.5fr_1.5fr_72px_100px_80px_32px] gap-2 text-xs font-medium text-gray-500 px-1">
        <div>Procedura</div>
        <div>Terapeut</div>
        <div>Počet</div>
        <div>Pref. čas</div>
        <div>Délka</div>
        <div></div>
      </div>

      {items.map((item, i) => {
        const procedure = procedures.find((p) => p.id === item.procedureId)
        return (
          <div
            key={i}
            className="grid grid-cols-[1.5fr_1.5fr_72px_100px_80px_32px] gap-2 items-center"
          >
            <select
              value={item.procedureId}
              onChange={(e) => update(i, 'procedureId', e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— procedura —</option>
              {procedures.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={item.therapistId}
              onChange={(e) => update(i, 'therapistId', e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— terapeut —</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={50}
              value={item.repetitions}
              onChange={(e) => update(i, 'repetitions', e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={item.preferredTime}
              onChange={(e) => update(i, 'preferredTime', e.target.value)}
              className="border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PREFERRED_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600 px-2">
              {procedure ? `${procedure.durationMin} min` : '—'}
            </div>

            <button
              type="button"
              onClick={() => remove(i)}
              disabled={items.length === 1}
              className="w-8 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
              title="Odebrat"
            >
              ×
            </button>
          </div>
        )
      })}

      <button
        type="button"
        onClick={add}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Přidat proceduru
      </button>
    </div>
  )
}
