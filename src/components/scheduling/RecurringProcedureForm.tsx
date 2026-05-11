'use client'

import { useState, useTransition } from 'react'
import { checkRecurringConflicts, createRecurringSchedules } from '@/actions/scheduleActions'
import { CATEGORIES, DAY_NAMES, START_TIMES } from '@/lib/constants'
import { formatDateParam, formatCzechFull } from '@/lib/dateUtils'
import type { Patient, Stay, Therapist, Procedure } from '@prisma/client'

type PreviewEntry = { date: string; hasConflict: boolean; conflictMessage?: string }

interface Props {
  patient: Patient
  stay: Stay
  procedures: Procedure[]
  therapists: Therapist[]
  onClose: () => void
  onSuccess: () => void
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function RecurringProcedureForm({
  patient,
  stay,
  procedures,
  therapists,
  onClose,
  onSuccess,
}: Props) {
  const [procedureId, setProcedureId] = useState('')
  const [therapistId, setTherapistId] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5])
  const [previewData, setPreviewData] = useState<PreviewEntry[] | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ created: number; skipped: number } | null>(
    null
  )
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const from = new Date(stay.arrivalDate)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(stay.departureDate)
  to.setUTCHours(0, 0, 0, 0)

  const grouped = Object.entries(CATEGORIES)
    .map(([key, label]) => ({
      label,
      items: procedures.filter((p) => p.category === key),
    }))
    .filter((g) => g.items.length > 0)

  function toggleDay(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
    setPreviewData(null)
  }

  function resetPreview() {
    setPreviewData(null)
  }

  async function handlePreview() {
    if (!procedureId || !therapistId || daysOfWeek.length === 0) return
    setIsChecking(true)
    setError('')
    try {
      const result = await checkRecurringConflicts({
        patientId: patient.id,
        therapistId,
        procedureId,
        startTime,
        daysOfWeek,
        from: formatDateParam(from),
        to: formatDateParam(to),
      })
      setPreviewData(result)
    } catch {
      setError('Chyba při kontrole konfliktů')
    } finally {
      setIsChecking(false)
    }
  }

  function handleSubmit() {
    setError('')
    startTransition(async () => {
      const result = await createRecurringSchedules({
        patientId: patient.id,
        procedureId,
        therapistId,
        startTime,
        daysOfWeek,
        from: formatDateParam(from),
        to: formatDateParam(to),
      })
      if (result.success) {
        setSubmitResult({ created: result.created, skipped: result.skipped })
      } else {
        setError(result.error ?? 'Chyba při vytváření termínů')
      }
    })
  }

  const nonConflictCount = previewData ? previewData.filter((e) => !e.hasConflict).length : 0
  const canPreview = !!procedureId && !!therapistId && daysOfWeek.length > 0
  const canSubmit = previewData !== null && nonConflictCount > 0 && !isPending

  if (submitResult) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Hotovo!</h2>
          <p className="text-gray-600 mb-1">
            Vytvořeno <span className="font-semibold text-green-700">{submitResult.created}</span>{' '}
            termínů
          </p>
          {submitResult.skipped > 0 && (
            <p className="text-sm text-amber-700 mb-4">
              Přeskočeno {submitResult.skipped} termínů kvůli konfliktu
            </p>
          )}
          <button
            onClick={onSuccess}
            className="mt-4 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="font-semibold text-lg">Plán procedury — opakovaně</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Procedura *</label>
            <select
              required
              value={procedureId}
              onChange={(e) => {
                setProcedureId(e.target.value)
                resetPreview()
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— vyberte proceduru —</option>
              {grouped.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationMin} min)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terapeut *</label>
            <select
              required
              value={therapistId}
              onChange={(e) => {
                setTherapistId(e.target.value)
                resetPreview()
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— vyberte terapeuta —</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.lastName} {t.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas začátku *</label>
            <select
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value)
                resetPreview()
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {START_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dny v týdnu *</label>
            <div className="flex gap-2 flex-wrap">
              {DAY_ORDER.map((day) => (
                <label
                  key={day}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-sm transition-colors select-none ${
                    daysOfWeek.includes(day)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={daysOfWeek.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="sr-only"
                  />
                  {DAY_NAMES[day]}
                </label>
              ))}
            </div>
            {daysOfWeek.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">Vyberte alespoň jeden den v týdnu</p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || isChecking}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isChecking ? 'Kontroluji konflikty...' : 'Zobrazit náhled termínů →'}
            </button>

            {previewData !== null && (
              <div className="mt-3 border rounded-lg overflow-hidden">
                {previewData.length === 0 ? (
                  <p className="text-sm text-gray-500 italic px-4 py-3">
                    Žádné dny pobytu neodpovídají výběru
                  </p>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 flex justify-between">
                      <span>{nonConflictCount} volných</span>
                      <span>
                        {previewData.length - nonConflictCount} konfliktů (budou přeskočeny)
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y">
                      {previewData.map((entry) => (
                        <div
                          key={entry.date}
                          className={`flex items-start gap-3 px-4 py-2 text-sm ${
                            entry.hasConflict ? 'bg-amber-50' : 'bg-white'
                          }`}
                        >
                          <span className="shrink-0 mt-0.5">{entry.hasConflict ? '⚠' : '✓'}</span>
                          <span
                            className={`flex-1 ${entry.hasConflict ? 'text-amber-800' : 'text-gray-700'}`}
                          >
                            {formatCzechFull(new Date(entry.date + 'T00:00:00'))}
                            {entry.hasConflict && entry.conflictMessage && (
                              <span className="block text-xs text-amber-600 mt-0.5">
                                {entry.conflictMessage}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending
              ? 'Vytvářím...'
              : previewData === null
                ? 'Nejprve zobrazit náhled'
                : nonConflictCount === 0
                  ? 'Žádné volné termíny'
                  : `Vytvořit ${nonConflictCount} termínů`}
          </button>
        </div>
      </div>
    </div>
  )
}
