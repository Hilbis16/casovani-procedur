'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDays } from 'date-fns'
import { AppointmentForm } from './AppointmentForm'
import { RecurringProcedureForm } from './RecurringProcedureForm'
import { formatCzechFull, sameDay } from '@/modules/core/lib/dateUtils'
import { DAY_NAMES_FULL } from '@/lib/constants'
import type { Patient, Stay, Therapist, Procedure, ProcedureSchedule } from '@prisma/client'

type FullSchedule = ProcedureSchedule & {
  patient: Patient
  therapist: Therapist
  procedure: Procedure
}

interface Props {
  patient: Patient
  stay: Stay
  schedules: FullSchedule[]
  therapists: Therapist[]
  procedures: Procedure[]
  patients: Patient[]
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'border-blue-200 bg-blue-50 text-blue-900',
  confirmed: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  completed: 'border-green-200 bg-green-50 text-green-900',
  cancelled: 'border-gray-200 bg-gray-50 text-gray-400 line-through',
  no_show: 'border-red-200 bg-red-50 text-red-700',
}

export function StayPlanningView({
  patient,
  stay,
  schedules,
  therapists,
  procedures,
  patients,
}: Props) {
  const router = useRouter()
  const [formDate, setFormDate] = useState<Date | null>(null)
  const [editSchedule, setEditSchedule] = useState<FullSchedule | undefined>(undefined)
  const [showRecurring, setShowRecurring] = useState(false)

  const from = new Date(stay.arrivalDate)
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(stay.departureDate)
  to.setUTCHours(0, 0, 0, 0)

  const days: Date[] = []
  let cur = new Date(from)
  while (cur <= to) {
    days.push(new Date(cur))
    cur = addDays(cur, 1)
  }

  const daySchedules = (day: Date) =>
    schedules
      .filter((s) => sameDay(new Date(s.date), day))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const today = new Date()

  function openAdd(day: Date) {
    setEditSchedule(undefined)
    setFormDate(day)
  }

  function openEdit(s: FullSchedule) {
    setFormDate(null)
    setEditSchedule(s)
  }

  function handleClose() {
    setFormDate(null)
    setEditSchedule(undefined)
  }

  function handleSuccess() {
    setFormDate(null)
    setEditSchedule(undefined)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{schedules.length} procedur celkem</p>
        <button
          onClick={() => setShowRecurring(true)}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          + Přidat plán procedury
        </button>
      </div>

      {days.map((day) => {
        const ds = daySchedules(day)
        const isToday = sameDay(day, today)

        return (
          <div
            key={day.toISOString()}
            className={`border rounded-xl p-4 ${isToday ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3
                className={`font-semibold text-sm ${isToday ? 'text-blue-700' : 'text-gray-700'}`}
              >
                {DAY_NAMES_FULL[day.getUTCDay()]} {formatCzechFull(day)}
                {isToday && (
                  <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-normal">
                    Dnes
                  </span>
                )}
              </h3>
              <button
                onClick={() => openAdd(day)}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Přidat proceduru
              </button>
            </div>

            {ds.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-0.5">Žádné procedury</p>
            ) : (
              <div className="space-y-1.5">
                {ds.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer hover:opacity-75 transition-opacity ${STATUS_COLORS[s.status] ?? STATUS_COLORS.planned}`}
                  >
                    <span className="font-mono text-xs font-semibold w-11 shrink-0">
                      {s.startTime}
                    </span>
                    <span className="text-sm font-medium flex-1">{s.procedure.name}</span>
                    {(s.procedure.building || s.procedure.room) && (
                      <span className="text-xs text-gray-400 shrink-0">
                        {[s.procedure.building, s.procedure.room].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 shrink-0">
                      {s.therapist.lastName} {s.therapist.firstName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {(formDate !== null || editSchedule !== undefined) && (
        <AppointmentForm
          patients={patients}
          therapists={therapists}
          procedures={procedures}
          initialDate={formDate ?? undefined}
          initialPatientId={patient.id}
          schedule={editSchedule}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}

      {showRecurring && (
        <RecurringProcedureForm
          patient={patient}
          stay={stay}
          procedures={procedures}
          therapists={therapists}
          onClose={() => setShowRecurring(false)}
          onSuccess={() => {
            setShowRecurring(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
