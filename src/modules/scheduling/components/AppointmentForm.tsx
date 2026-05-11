'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '@/modules/scheduling/actions/scheduleActions'
import { START_TIMES, CATEGORIES } from '@/lib/constants'
import { addMinutes, formatDateParam } from '@/modules/core/lib/dateUtils'
import type { Patient, Therapist, Procedure, ProcedureSchedule } from '@prisma/client'

type FullSchedule = ProcedureSchedule & {
  patient: Patient
  therapist: Therapist
  procedure: Procedure
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Naplánováno' },
  { value: 'confirmed', label: 'Potvrzeno' },
  { value: 'completed', label: 'Absolvováno' },
  { value: 'cancelled', label: 'Zrušeno' },
  { value: 'no_show', label: 'Nedostavil se' },
]

interface Props {
  patients: Patient[]
  therapists: Therapist[]
  procedures: Procedure[]
  initialDate?: Date
  initialStartTime?: string
  initialPatientId?: string
  schedule?: FullSchedule
  onClose: () => void
  onSuccess: () => void
}

interface Conflict {
  type: string
  message: string
}

export function AppointmentForm({
  patients,
  therapists,
  procedures,
  initialDate,
  initialStartTime,
  initialPatientId,
  schedule,
  onClose,
  onSuccess,
}: Props) {
  const isEdit = !!schedule

  const [patientId, setPatientId] = useState(schedule?.patientId ?? initialPatientId ?? '')
  const [procedureId, setProcedureId] = useState(schedule?.procedureId ?? '')
  const [therapistId, setTherapistId] = useState(schedule?.therapistId ?? '')
  const [date, setDate] = useState(
    schedule
      ? formatDateParam(new Date(schedule.date))
      : initialDate
        ? formatDateParam(initialDate)
        : ''
  )
  const [startTime, setStartTime] = useState(schedule?.startTime ?? initialStartTime ?? '08:00')
  const [status, setStatus] = useState(schedule?.status ?? 'planned')
  const [note, setNote] = useState(schedule?.note ?? '')
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const selectedProcedure = procedures.find((p) => p.id === procedureId)
  const durationMin = selectedProcedure?.durationMin ?? 0
  const endTime = durationMin ? addMinutes(startTime, durationMin) : ''

  const hasRequiredFields = !!(patientId && therapistId && date && startTime && durationMin)
  const effectiveConflicts = hasRequiredFields ? conflicts : []

  useEffect(() => {
    if (!patientId || !therapistId || !date || !startTime || !durationMin) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({
        patientId,
        therapistId,
        date,
        startTime,
        durationMin: durationMin.toString(),
        ...(isEdit ? { excludeId: schedule!.id } : {}),
        ...(procedureId ? { procedureId } : {}),
      })
      const [konfliktyRes, navrhyRes] = await Promise.all([
        fetch(`/api/konflikty?${params}`).then((r) => r.json()),
        fetch(`/api/navrhy?${params}`).then((r) => r.json()),
      ])
      setConflicts(konfliktyRes.conflicts ?? [])
      setSuggestions(navrhyRes.slots ?? [])
    }, 300)
  }, [patientId, procedureId, therapistId, date, startTime, durationMin, isEdit, schedule])

  const grouped = Object.entries(CATEGORIES)
    .map(([key, label]) => ({
      label,
      items: procedures.filter((p) => p.category === key),
    }))
    .filter((g) => g.items.length > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (effectiveConflicts.length > 0) return
    setError('')

    const fd = new FormData()
    fd.set('patientId', patientId)
    fd.set('procedureId', procedureId)
    fd.set('therapistId', therapistId)
    fd.set('date', date)
    fd.set('startTime', startTime)
    fd.set('durationMin', durationMin.toString())
    fd.set('note', note)
    if (isEdit) fd.set('status', status)

    startTransition(async () => {
      const result = isEdit ? await updateSchedule(schedule!.id, fd) : await createSchedule(fd)

      if (result.success) {
        onSuccess()
      } else {
        setError(result.error ?? 'Chyba při ukládání')
      }
    })
  }

  async function handleDelete() {
    if (!confirm('Opravdu smazat tuto proceduru?')) return
    startTransition(async () => {
      await deleteSchedule(schedule!.id)
      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-lg">
            {isEdit ? 'Upravit proceduru' : 'Nová procedura'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pacient *</label>
            <select
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— vyberte pacienta —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName} {p.firstName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Procedura *</label>
            <select
              required
              value={procedureId}
              onChange={(e) => setProcedureId(e.target.value)}
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
              onChange={(e) => setTherapistId(e.target.value)}
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

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Začátek *</label>
              <select
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Konec</label>
              <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 h-[38px] flex items-center">
                {endTime || '—'}
              </div>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stav</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {effectiveConflicts.length > 0 && (
            <div className="space-y-2">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1">
                {effectiveConflicts.map((c, i) => (
                  <p key={i} className="text-sm text-amber-800">
                    ⚠ {c.message}
                  </p>
                ))}
              </div>
              {suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">Volné alternativy:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStartTime(slot)}
                        className="px-2.5 py-1 bg-white border border-blue-300 rounded text-sm text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors font-mono"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Poznámka</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Nepovinná poznámka..."
            />
          </div>

          <div className="flex justify-between pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Smazat
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Zrušit
              </button>
            )}
            <button
              type="submit"
              disabled={
                isPending ||
                effectiveConflicts.length > 0 ||
                !patientId ||
                !procedureId ||
                !therapistId ||
                !date
              }
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Ukládám...' : 'Uložit →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
