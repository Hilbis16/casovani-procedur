'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Patient, Therapist, Procedure, ProcedureSchedule } from '@prisma/client'
import { AppointmentForm } from './AppointmentForm'
import { DAY_NAMES, GRID_START_HOUR, GRID_END_HOUR, PIXELS_PER_MINUTE } from '@/lib/constants'
import { formatCzechDate, sameDay, timeToMinutes } from '@/lib/dateUtils'

type FullSchedule = ProcedureSchedule & {
  patient: Patient
  therapist: Therapist
  procedure: Procedure
}

interface Props {
  weekDays: Date[]
  schedules: FullSchedule[]
  patients: Patient[]
  therapists: Therapist[]
  procedures: Procedure[]
  filterPatientId?: string
  filterTherapistId?: string
  filterRoom?: string
  readOnly?: boolean
}

const GRID_MINUTES = (GRID_END_HOUR - GRID_START_HOUR) * 60
const GRID_HEIGHT = GRID_MINUTES * PIXELS_PER_MINUTE
const GRID_START_MIN = GRID_START_HOUR * 60

function timeToTop(hhmm: string): number {
  return (timeToMinutes(hhmm) - GRID_START_MIN) * PIXELS_PER_MINUTE
}

function durationToHeight(startTime: string, endTime: string): number {
  return (timeToMinutes(endTime) - timeToMinutes(startTime)) * PIXELS_PER_MINUTE
}

function hourLabels(): string[] {
  const labels = []
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`)
  }
  return labels
}

export function WeeklyGrid({
  weekDays,
  schedules,
  patients,
  therapists,
  procedures,
  filterPatientId,
  filterTherapistId,
  filterRoom,
  readOnly = false,
}: Props) {
  const router = useRouter()
  const [formState, setFormState] = useState<{
    open: boolean
    date?: Date
    startTime?: string
    schedule?: FullSchedule
  }>({ open: false })

  function handleBlockClick(e: React.MouseEvent, schedule: FullSchedule) {
    e.stopPropagation()
    if (readOnly) return
    setFormState({ open: true, schedule })
  }

  function handleFormSuccess() {
    setFormState({ open: false })
    router.refresh()
  }

  const hours = hourLabels()

  const filteredSchedules = schedules.filter((s) => {
    if (filterPatientId && s.patientId !== filterPatientId) return false
    if (filterTherapistId && s.therapistId !== filterTherapistId) return false
    if (filterRoom && s.procedure.room !== filterRoom) return false
    return true
  })

  return (
    <div className="relative">
      {formState.open && !readOnly && (
        <AppointmentForm
          patients={patients}
          therapists={therapists}
          procedures={procedures}
          initialDate={formState.date}
          initialStartTime={formState.startTime}
          initialPatientId={filterPatientId}
          schedule={formState.schedule}
          onClose={() => setFormState({ open: false })}
          onSuccess={handleFormSuccess}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="min-w-[700px]">
          {/* Header */}
          <div
            className="grid border-b border-gray-200"
            style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
          >
            <div className="py-2 px-2 text-xs text-gray-400 text-center border-r border-gray-100" />
            {weekDays.map((day, i) => {
              const isToday = sameDay(day, new Date())
              return (
                <div
                  key={i}
                  className={`py-2 text-center border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div
                    className={`text-xs font-semibold ${isToday ? 'text-blue-700' : 'text-gray-500'}`}
                  >
                    {DAY_NAMES[day.getDay()]}
                  </div>
                  <div
                    className={`text-sm font-bold ${isToday ? 'text-blue-700' : 'text-gray-800'}`}
                  >
                    {formatCzechDate(day)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Body */}
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
            {/* Hour labels */}
            <div className="relative border-r border-gray-100" style={{ height: GRID_HEIGHT }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 text-right pr-2 text-xs text-gray-400"
                  style={{ top: i * 60 * PIXELS_PER_MINUTE - 7 }}
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIdx) => {
              const daySchedules = filteredSchedules.filter((s) => sameDay(new Date(s.date), day))
              const isToday = sameDay(day, new Date())

              return (
                <div
                  key={dayIdx}
                  className={`relative border-r border-gray-100 last:border-r-0 cursor-pointer group ${
                    isToday ? 'bg-blue-50/30' : ''
                  }`}
                  style={{ height: GRID_HEIGHT }}
                  onClick={() => {
                    if (!readOnly) setFormState({ open: true, date: day, startTime: '08:00' })
                  }}
                >
                  {/* Hour grid lines */}
                  {hours.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-100"
                      style={{ top: i * 60 * PIXELS_PER_MINUTE }}
                    />
                  ))}

                  {/* Hover hint */}
                  {!readOnly && (
                    <div className="absolute inset-0 group-hover:bg-blue-50/20 transition-colors pointer-events-none" />
                  )}

                  {/* Appointment blocks */}
                  {daySchedules.map((s) => {
                    const top = timeToTop(s.startTime)
                    const height = Math.max(durationToHeight(s.startTime, s.endTime), 20)
                    const color = s.therapist.color

                    return (
                      <div
                        key={s.id}
                        onClick={(e) => handleBlockClick(e, s)}
                        className="absolute left-1 right-1 rounded overflow-hidden cursor-pointer hover:brightness-95 transition-all shadow-sm"
                        style={{
                          top,
                          height,
                          backgroundColor: `${color}20`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <div className="px-1.5 pt-0.5 leading-tight">
                          <div className="text-xs font-semibold truncate" style={{ color }}>
                            {s.procedure.name}
                          </div>
                          {height >= 28 && (
                            <div className="text-xs text-gray-600 truncate">
                              {filterPatientId
                                ? `● ${s.therapist.lastName}`
                                : `${s.patient.lastName}`}
                            </div>
                          )}
                          {height >= 40 && s.procedure.room && (
                            <div className="text-xs text-gray-400 truncate">
                              📍 {s.procedure.room}
                            </div>
                          )}
                          {height >= 54 && (
                            <div className="text-xs text-gray-400">
                              {s.startTime}–{s.endTime}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!readOnly && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Kliknutím do volného místa přidáte novou proceduru · Kliknutím na blok ji upravíte
        </p>
      )}
    </div>
  )
}
