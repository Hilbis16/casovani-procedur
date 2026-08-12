'use client'

import type { Procedure, Therapist } from '@prisma/client'
import { formatCzechFull } from '@/modules/core/lib/dateUtils'
import type {
  ProposalSlot,
  PrescriptionAdjustment,
} from '@/modules/scheduling/actions/prescriptionActions'

interface Props {
  proposals: ProposalSlot[]
  procedures: Procedure[]
  therapists: Therapist[]
  onSkip: (itemIndex: number, occurrence: number) => void
  onMove: (slot: ProposalSlot) => void
  adjustments: PrescriptionAdjustment[]
}

const WEEKDAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']

function groupByDate(proposals: ProposalSlot[]): { date: Date; slots: ProposalSlot[] }[] {
  const map = new Map<string, ProposalSlot[]>()
  for (const p of proposals) {
    const key = p.date.toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, slots]) => ({
      date: new Date(key + 'T00:00:00.000Z'),
      slots: slots.sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }))
}

export function PrescriptionPreview({ proposals, procedures, therapists, onSkip, onMove }: Props) {
  if (proposals.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic py-8 text-center bg-gray-50 rounded-lg">
        Žádné navrhované termíny.
      </div>
    )
  }

  const procById = new Map(procedures.map((p) => [p.id, p]))
  const therById = new Map(therapists.map((t) => [t.id, t]))

  const okCount = proposals.filter((p) => p.conflicts.length === 0).length
  const conflictCount = proposals.length - okCount
  const grouped = groupByDate(proposals)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-4 py-3">
        <span className="text-gray-700">
          Celkem <strong>{proposals.length}</strong> termínů
        </span>
        <span className="flex gap-4">
          <span className="text-green-700">✓ {okCount} OK</span>
          {conflictCount > 0 && <span className="text-red-700">⚠ {conflictCount} konflikt</span>}
        </span>
      </div>

      <div className="space-y-3">
        {grouped.map(({ date, slots }) => (
          <div key={date.toISOString()} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
              {WEEKDAY_NAMES[date.getUTCDay()]} {formatCzechFull(date)}
            </div>
            <div className="divide-y">
              {slots.map((slot) => {
                const proc = procById.get(slot.procedureId)
                const ther = therById.get(slot.therapistId)
                const hasConflict = slot.conflicts.length > 0
                return (
                  <div
                    key={`${slot.itemIndex}-${slot.occurrence}`}
                    className={`px-4 py-2 flex items-center gap-3 ${
                      hasConflict ? 'bg-red-50' : 'bg-white'
                    }`}
                  >
                    <span className="text-sm font-mono text-gray-700 w-24">
                      {slot.startTime}–{slot.endTime}
                    </span>
                    <span className="text-sm flex-1">
                      <strong>{proc?.name ?? '?'}</strong>
                      <span className="text-gray-500">
                        {' '}
                        · {ther ? `${ther.lastName} ${ther.firstName}` : '?'}
                      </span>
                    </span>
                    {hasConflict ? (
                      <>
                        <span
                          className="text-xs text-red-700 max-w-md truncate"
                          title={slot.conflicts[0].message}
                        >
                          ⚠ {slot.conflicts[0].message}
                        </span>
                        <button
                          type="button"
                          onClick={() => onMove(slot)}
                          className="text-xs px-2 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
                        >
                          Přesunout
                        </button>
                        <button
                          type="button"
                          onClick={() => onSkip(slot.itemIndex, slot.occurrence)}
                          className="text-xs px-2 py-1 bg-white border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                        >
                          Skip
                        </button>
                      </>
                    ) : (
                      <span className="text-green-600 text-sm">✓</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
