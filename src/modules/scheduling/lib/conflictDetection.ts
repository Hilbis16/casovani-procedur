import { prisma } from '@/modules/core/db/prisma'

export interface ConflictResult {
  type:
    | 'therapist'
    | 'patient'
    | 'room'
    | 'therapist_unavailable'
    | 'therapist_time_off'
    | 'procedure_capacity'
  message: string
  scheduleId: string
}

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA
}

export async function findConflicts(params: {
  therapistId: string
  patientId: string
  date: Date
  startTime: string
  endTime: string
  excludeScheduleId?: string
  procedureRoomId?: string
  procedureId?: string
}): Promise<ConflictResult[]> {
  const {
    therapistId,
    patientId,
    date,
    startTime,
    endTime,
    excludeScheduleId,
    procedureRoomId,
    procedureId,
  } = params

  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCHours(23, 59, 59, 999)

  const conflicts: ConflictResult[] = []

  // Check therapist availability for this day/time
  const dayOfWeek = dayStart.getUTCDay()
  const availability = await prisma.therapistAvailability.findFirst({
    where: { therapistId, dayOfWeek },
  })
  if (!availability) {
    conflicts.push({
      type: 'therapist_unavailable',
      message: `Terapeut není v tento den k dispozici`,
      scheduleId: '',
    })
    return conflicts
  }
  if (startTime < availability.startTime || endTime > availability.endTime) {
    conflicts.push({
      type: 'therapist_unavailable',
      message: `Procedura je mimo pracovní dobu terapeuta (${availability.startTime}–${availability.endTime})`,
      scheduleId: '',
    })
    return conflicts
  }

  // Check therapist time-off
  const timeOffs = await prisma.therapistTimeOff.findMany({
    where: { therapistId, startsAt: { lte: dayEnd }, endsAt: { gte: dayStart } },
  })
  if (timeOffs.length > 0) {
    conflicts.push({
      type: 'therapist_time_off',
      message: `Terapeut má v tento den volno${timeOffs[0].reason ? ` (${timeOffs[0].reason})` : ''}`,
      scheduleId: '',
    })
    return conflicts
  }

  // Check schedule overlaps (therapist, patient, room, procedure capacity)
  const orConditions: object[] = [{ therapistId }, { patientId }]
  if (procedureRoomId) orConditions.push({ procedureRoomId })
  if (procedureId) orConditions.push({ procedureId })

  const schedules = await prisma.procedureSchedule.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      status: { not: 'cancelled' },
      deletedAt: null,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      OR: orConditions,
    },
    include: { therapist: true, patient: true, procedure: true, procedureRoom: true },
  })

  for (const s of schedules) {
    if (!intervalsOverlap(s.startTime, s.endTime, startTime, endTime)) continue

    if (s.therapistId === therapistId) {
      conflicts.push({
        type: 'therapist',
        message: `Terapeut ${s.therapist.lastName} má v tento čas jinou proceduru (${s.procedure.name}, ${s.startTime}–${s.endTime})`,
        scheduleId: s.id,
      })
    }
    if (s.patientId === patientId) {
      conflicts.push({
        type: 'patient',
        message: `Pacient ${s.patient.lastName} má v tento čas jinou proceduru (${s.procedure.name}, ${s.startTime}–${s.endTime})`,
        scheduleId: s.id,
      })
    }
    if (procedureRoomId && s.procedureRoomId === procedureRoomId) {
      conflicts.push({
        type: 'room',
        message: `Místnost ${s.procedureRoom?.number ?? ''} je v tento čas obsazena (${s.procedure.name}, ${s.startTime}–${s.endTime})`,
        scheduleId: s.id,
      })
    }
  }

  if (procedureId) {
    const proc = await prisma.procedure.findUnique({
      where: { id: procedureId },
      select: { capacity: true, name: true },
    })
    if (proc) {
      const concurrentCount = schedules.filter(
        (s) =>
          s.procedureId === procedureId &&
          intervalsOverlap(s.startTime, s.endTime, startTime, endTime)
      ).length
      if (concurrentCount >= proc.capacity) {
        conflicts.push({
          type: 'procedure_capacity',
          message: `Procedura ${proc.name} je plně obsazena (max ${proc.capacity} ${proc.capacity === 1 ? 'pacient' : 'pacienti'} najednou)`,
          scheduleId: '',
        })
      }
    }
  }

  return conflicts
}
