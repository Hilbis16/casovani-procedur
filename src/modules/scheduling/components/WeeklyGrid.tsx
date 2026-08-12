'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Patient, Therapist, Procedure, ProcedureSchedule } from '@prisma/client'
import { AppointmentForm } from './AppointmentForm'
import { moveSchedule } from '@/modules/scheduling/actions/scheduleActions'
import { DAY_NAMES, GRID_START_HOUR, GRID_END_HOUR, PIXELS_PER_MINUTE } from '@/lib/constants'
import { formatCzechDate, sameDay, timeToMinutes } from '@/modules/core/lib/dateUtils'

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
  const [isPending, startTransition] = useTransition()
  const [formState, setFormState] = useState<{
    open: boolean
    date?: Date
    startTime?: string
    schedule?: FullSchedule
  }>({ open: false })

  const todayIdx = weekDays.findIndex((d) => sameDay(d, new Date()))
  const [viewMode, setViewMode] = useState<'week' | 'day'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'day' : 'week'
  )
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIdx >= 0 ? todayIdx : 0)

  // Drag & drop state
  const [dragging, setDragging] = useState<{
    schedule: FullSchedule
    durationMin: number
    grabOffsetMin: number
  } | null>(null)
  const [dropPreview, setDropPreview] = useState<{ colIdx: number; startTime: string } | null>(null)
  const colRefs = useRef<(HTMLDivElement | null)[]>([])

  function snapToGrid(totalMin: number) {
    const snapped = Math.round(totalMin / 15) * 15
    return Math.max(GRID_START_HOUR * 60, Math.min((GRID_END_HOUR - 1) * 60, snapped))
  }

  function minsToTime(totalMin: number) {
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  function handleDragStart(e: React.DragEvent, s: FullSchedule) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const grabY = e.clientY - rect.top
    const grabOffsetMin = Math.round(grabY / PIXELS_PER_MINUTE)
    const durationMin = timeToMinutes(s.endTime) - timeToMinutes(s.startTime)
    setDragging({ schedule: s, durationMin, grabOffsetMin })
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDragging(null)
    setDropPreview(null)
  }

  function handleColDragOver(e: React.DragEvent, colIdx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragging || !colRefs.current[colIdx]) return
    const rect = colRefs.current[colIdx]!.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const rawMin =
      GRID_START_HOUR * 60 + Math.round(relY / PIXELS_PER_MINUTE) - dragging.grabOffsetMin
    const startTime = minsToTime(snapToGrid(rawMin))
    setDropPreview({ colIdx, startTime })
  }

  function handleColDragLeave(colIdx: number) {
    setDropPreview((prev) => (prev?.colIdx === colIdx ? null : prev))
  }

  function handleColDrop(e: React.DragEvent, day: Date, colIdx: number) {
    e.preventDefault()
    if (!dragging || !dropPreview || dropPreview.colIdx !== colIdx) return
    const { schedule, durationMin } = dragging
    const { startTime } = dropPreview
    const unchanged = sameDay(new Date(schedule.date), day) && schedule.startTime === startTime
    setDragging(null)
    setDropPreview(null)
    if (unchanged) return
    startTransition(async () => {
      const res = await moveSchedule(schedule.id, day, startTime, durationMin)
      if (res.success) {
        if (res.conflicts && res.conflicts.length > 0) {
          toast.warning(`Přesunuto – pozor: ${res.conflicts[0].message}`)
        } else {
          toast.success('Procedura přesunuta')
        }
        router.refresh()
      } else {
        toast.error('error' in res ? res.error : 'Chyba při přesouvání')
      }
    })
  }

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

  const visibleDays = viewMode === 'day' ? [weekDays[selectedDayIdx]] : weekDays
  const colCount = visibleDays.length

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

      {/* View toggle + day selector */}
      <div className="flex items-center justify-between mb-2 gap-2">
        {/* Day tabs (visible in day mode) */}
        {viewMode === 'day' && (
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {weekDays.map((day, i) => {
              const isToday = sameDay(day, new Date())
              const isSelected = i === selectedDayIdx
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDayIdx(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {DAY_NAMES[day.getDay()]} {formatCzechDate(day)}
                </button>
              )
            })}
          </div>
        )}
        {viewMode === 'week' && <div />}

        {/* Week/Day toggle */}
        <div className="shrink-0 flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Den
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 transition-colors border-l border-gray-200 ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Týden
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div style={{ minWidth: viewMode === 'day' ? 'auto' : '700px' }}>
          {/* Header */}
          <div
            className="grid border-b border-gray-200"
            style={{ gridTemplateColumns: `60px repeat(${colCount}, 1fr)` }}
          >
            <div className="py-2 px-2 text-xs text-gray-400 text-center border-r border-gray-100" />
            {visibleDays.map((day, i) => {
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
          <div className="grid" style={{ gridTemplateColumns: `60px repeat(${colCount}, 1fr)` }}>
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
            {visibleDays.map((day, colIdx) => {
              const daySchedules = filteredSchedules.filter((s) => sameDay(new Date(s.date), day))
              const isToday = sameDay(day, new Date())
              const isDropTarget = dropPreview?.colIdx === colIdx

              return (
                <div
                  key={colIdx}
                  ref={(el) => {
                    colRefs.current[colIdx] = el
                  }}
                  className={`relative border-r border-gray-100 last:border-r-0 cursor-pointer group ${
                    isToday ? 'bg-blue-50/30' : ''
                  } ${isDropTarget ? 'bg-blue-50/40' : ''}`}
                  style={{ height: GRID_HEIGHT }}
                  onClick={() => {
                    if (!readOnly && !dragging)
                      setFormState({ open: true, date: day, startTime: '08:00' })
                  }}
                  onDragOver={(e) => handleColDragOver(e, colIdx)}
                  onDragLeave={() => handleColDragLeave(colIdx)}
                  onDrop={(e) => handleColDrop(e, day, colIdx)}
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

                  {/* Drop preview ghost */}
                  {isDropTarget && dropPreview && dragging && (
                    <div
                      className="absolute left-1 right-1 rounded border-2 border-dashed border-blue-400 bg-blue-50/70 pointer-events-none z-10"
                      style={{
                        top: timeToTop(dropPreview.startTime),
                        height: Math.max(dragging.durationMin * PIXELS_PER_MINUTE, 20),
                      }}
                    >
                      <div className="px-1.5 pt-0.5 text-xs font-semibold text-blue-600">
                        {dropPreview.startTime}
                      </div>
                    </div>
                  )}

                  {/* Appointment blocks */}
                  {daySchedules.map((s) => {
                    const top = timeToTop(s.startTime)
                    const height = Math.max(durationToHeight(s.startTime, s.endTime), 20)
                    const color = s.therapist.color
                    const isDraggingThis = dragging?.schedule.id === s.id
                    const canDrag =
                      !readOnly && !['completed', 'cancelled', 'no_show'].includes(s.status)

                    return (
                      <div
                        key={s.id}
                        draggable={canDrag}
                        onDragStart={canDrag ? (e) => handleDragStart(e, s) : undefined}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => handleBlockClick(e, s)}
                        className={`absolute left-1 right-1 rounded overflow-hidden hover:brightness-95 transition-all shadow-sm ${
                          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                        } ${isDraggingThis ? 'opacity-30' : ''} ${isPending ? 'pointer-events-none' : ''}`}
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
