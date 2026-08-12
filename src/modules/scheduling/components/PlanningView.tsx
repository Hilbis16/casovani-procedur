'use client'

import { useState } from 'react'
import type { Patient, Therapist, Procedure, ProcedureSchedule } from '@prisma/client'
import { WeeklyGrid } from './WeeklyGrid'
import { WeekSelector } from './WeekSelector'
import { sameDay } from '@/modules/core/lib/dateUtils'

type FullSchedule = ProcedureSchedule & {
  patient: Patient
  therapist: Therapist
  procedure: Procedure
}

interface Props {
  weekDays: Date[]
  weekStart: Date
  schedules: FullSchedule[]
  patients: Patient[]
  therapists: Therapist[]
  procedures: Procedure[]
}

export function PlanningView({
  weekDays,
  weekStart,
  schedules,
  patients,
  therapists,
  procedures,
}: Props) {
  const [filterTherapistId, setFilterTherapistId] = useState<string | undefined>()
  const [filterPatientId, setFilterPatientId] = useState<string | undefined>()
  const [filterRoom, setFilterRoom] = useState<string>('')

  const rooms = [...new Set(procedures.filter((p) => p.room).map((p) => p.room!))].sort()

  const hasFilters = !!filterTherapistId || !!filterPatientId || !!filterRoom

  const filtered = schedules.filter((s) => {
    if (filterTherapistId && s.therapistId !== filterTherapistId) return false
    if (filterPatientId && s.patientId !== filterPatientId) return false
    if (filterRoom && s.procedure.room !== filterRoom) return false
    return true
  })

  const countForDay = (day: Date) => filtered.filter((s) => sameDay(new Date(s.date), day)).length

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-xl">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
          Filtr:
        </span>

        <select
          value={filterTherapistId ?? ''}
          onChange={(e) => setFilterTherapistId(e.target.value || undefined)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Všichni terapeuti</option>
          {therapists.map((t) => (
            <option key={t.id} value={t.id}>
              {t.lastName} {t.firstName}
            </option>
          ))}
        </select>

        <select
          value={filterPatientId ?? ''}
          onChange={(e) => setFilterPatientId(e.target.value || undefined)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Všichni pacienti</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName} {p.firstName}
            </option>
          ))}
        </select>

        {rooms.length > 0 && (
          <select
            value={filterRoom}
            onChange={(e) => setFilterRoom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Všechny místnosti</option>
            {rooms.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => {
              setFilterTherapistId(undefined)
              setFilterPatientId(undefined)
              setFilterRoom('')
            }}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ✕ Zrušit filtr
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <WeekSelector weekStart={weekStart} baseHref="/planovani" />
        </div>
      </div>

      {/* Per-day stats strip */}
      <div className="grid mb-2 px-0" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
        <div />
        {weekDays.map((day, i) => {
          const count = countForDay(day)
          return (
            <div key={i} className="text-center py-1">
              {count > 0 ? (
                <span className="inline-flex items-center justify-center text-xs font-medium text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                  {count}×
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              )}
            </div>
          )
        })}
      </div>

      <WeeklyGrid
        weekDays={weekDays}
        schedules={schedules}
        patients={patients}
        therapists={therapists}
        procedures={procedures}
        filterTherapistId={filterTherapistId}
        filterPatientId={filterPatientId}
        filterRoom={filterRoom || undefined}
      />
    </div>
  )
}
