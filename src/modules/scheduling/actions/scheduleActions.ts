'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/modules/core/db/prisma'
import { findConflicts } from '@/modules/scheduling/lib/conflictDetection'
import { addMinutes, formatDateParam } from '@/modules/core/lib/dateUtils'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'
import { checkPermission } from '@/modules/core/rbac'
import { isModuleEnabled } from '@/modules/core/features'

const ScheduleSchema = z.object({
  patientId: z.string().min(1, 'Pacient je povinný'),
  procedureId: z.string().min(1, 'Procedura je povinná'),
  therapistId: z.string().min(1, 'Terapeut je povinný'),
  date: z.string().min(1, 'Datum je povinné'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Neplatný čas'),
  durationMin: z.coerce.number().int().positive(),
  note: z.string().optional(),
  status: z.string().optional(),
})

function revalidateAll() {
  revalidatePath('/planovani')
  revalidatePath('/pacienti')
  revalidatePath('/terapeuti')
}

export async function getWeekSchedules(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  return prisma.procedureSchedule.findMany({
    where: { date: { gte: weekStart, lte: weekEnd }, deletedAt: null },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

export async function getPatientWeekSchedules(patientId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  return prisma.procedureSchedule.findMany({
    where: { patientId, date: { gte: weekStart, lte: weekEnd }, deletedAt: null },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

export async function getTherapistWeekSchedules(therapistId: string, weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setUTCHours(23, 59, 59, 999)

  return prisma.procedureSchedule.findMany({
    where: { therapistId, date: { gte: weekStart, lte: weekEnd }, deletedAt: null },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

export async function createSchedule(formData: FormData) {
  const deny = await checkPermission('schedule.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = ScheduleSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { patientId, procedureId, therapistId, date, startTime, durationMin, note } = parsed.data
  const endTime = addMinutes(startTime, durationMin)
  const dateObj = new Date(date)
  dateObj.setUTCHours(0, 0, 0, 0)

  let stayId: string | null = null
  if (isModuleEnabled('hotel')) {
    const activeStay = await prisma.stay.findFirst({
      where: { patientId, deletedAt: null },
      orderBy: { arrivalDate: 'desc' },
    })
    if (!activeStay) return { success: false, error: 'Pacient nemá aktivní pobyt' }
    stayId = activeStay.id
  }

  const conflicts = await findConflicts({
    therapistId,
    patientId,
    date: dateObj,
    startTime,
    endTime,
  })
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: conflicts[0].message }
  }

  const schedule = await prisma.procedureSchedule.create({
    data: {
      stayId,
      patientId,
      procedureId,
      therapistId,
      date: dateObj,
      startTime,
      endTime,
      note: note || null,
    },
  })
  await writeAuditLog({
    action: 'schedule.create',
    entity: 'ProcedureSchedule',
    entityId: schedule.id,
    after: { patientId, therapistId, date, startTime },
  })
  revalidateAll()
  return { success: true }
}

export async function updateSchedule(id: string, formData: FormData) {
  const deny = await checkPermission('schedule.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = ScheduleSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { patientId, procedureId, therapistId, date, startTime, durationMin, note, status } =
    parsed.data
  const endTime = addMinutes(startTime, durationMin)
  const dateObj = new Date(date)
  dateObj.setUTCHours(0, 0, 0, 0)

  const conflicts = await findConflicts({
    therapistId,
    patientId,
    date: dateObj,
    startTime,
    endTime,
    excludeScheduleId: id,
  })
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: conflicts[0].message }
  }

  await prisma.procedureSchedule.update({
    where: { id },
    data: {
      patientId,
      procedureId,
      therapistId,
      date: dateObj,
      startTime,
      endTime,
      note: note || null,
      ...(status ? { status } : {}),
    },
  })
  await writeAuditLog({
    action: 'schedule.update',
    entity: 'ProcedureSchedule',
    entityId: id,
    after: { patientId, therapistId, date, startTime },
  })
  revalidateAll()
  return { success: true }
}

export async function updateScheduleStatus(id: string, status: string) {
  const deny = await checkPermission('schedule.status')
  if (deny) return deny

  await prisma.procedureSchedule.update({ where: { id }, data: { status } })
  await writeAuditLog({
    action: 'schedule.status_change',
    entity: 'ProcedureSchedule',
    entityId: id,
    after: { status },
  })
  revalidateAll()
  return { success: true }
}

export async function deleteSchedule(id: string) {
  const deny = await checkPermission('schedule.delete')
  if (deny) return deny

  await prisma.procedureSchedule.delete({ where: { id } })
  await writeAuditLog({ action: 'schedule.delete', entity: 'ProcedureSchedule', entityId: id })
  revalidateAll()
  return { success: true }
}

export async function getPatientStaySchedules(patientId: string, from: Date, to: Date) {
  const dayStart = new Date(from)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(to)
  dayEnd.setUTCHours(23, 59, 59, 999)

  return prisma.procedureSchedule.findMany({
    where: { patientId, date: { gte: dayStart, lte: dayEnd }, deletedAt: null },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

const RecurringSchema = z.object({
  patientId: z.string().min(1),
  procedureId: z.string().min(1),
  therapistId: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string().optional(),
})

export async function checkRecurringConflicts(data: {
  patientId: string
  therapistId: string
  procedureId: string
  startTime: string
  daysOfWeek: number[]
  from: string
  to: string
}): Promise<{ date: string; hasConflict: boolean; conflictMessage?: string }[]> {
  const procedure = await prisma.procedure.findUnique({ where: { id: data.procedureId } })
  if (!procedure) return []

  const endTime = addMinutes(data.startTime, procedure.durationMin)
  const results: { date: string; hasConflict: boolean; conflictMessage?: string }[] = []

  const cur = new Date(data.from)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(data.to)
  end.setUTCHours(0, 0, 0, 0)

  while (cur <= end) {
    if (data.daysOfWeek.includes(cur.getUTCDay())) {
      const conflicts = await findConflicts({
        patientId: data.patientId,
        therapistId: data.therapistId,
        date: new Date(cur),
        startTime: data.startTime,
        endTime,
      })
      results.push({
        date: formatDateParam(new Date(cur)),
        hasConflict: conflicts.length > 0,
        conflictMessage: conflicts[0]?.message,
      })
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  return results
}

export async function createRecurringSchedules(data: {
  patientId: string
  procedureId: string
  therapistId: string
  startTime: string
  daysOfWeek: number[]
  from: string
  to: string
  note?: string
}): Promise<{ success: boolean; created: number; skipped: number; error?: string }> {
  const deny = await checkPermission('schedule.write')
  if (deny) return { ...deny, created: 0, skipped: 0 }

  const parsed = RecurringSchema.safeParse(data)
  if (!parsed.success)
    return { success: false, created: 0, skipped: 0, error: parsed.error.issues[0].message }

  const { patientId, procedureId, therapistId, startTime, daysOfWeek, from, to, note } = parsed.data

  const procedure = await prisma.procedure.findUnique({ where: { id: procedureId } })
  if (!procedure) return { success: false, created: 0, skipped: 0, error: 'Procedura nenalezena' }

  const activeStay = await prisma.stay.findFirst({
    where: { patientId, deletedAt: null },
    orderBy: { arrivalDate: 'desc' },
  })
  if (!activeStay)
    return { success: false, created: 0, skipped: 0, error: 'Pacient nemá aktivní pobyt' }

  const endTime = addMinutes(startTime, procedure.durationMin)

  const toCreate: {
    stayId: string
    patientId: string
    procedureId: string
    therapistId: string
    date: Date
    startTime: string
    endTime: string
    note: string | null
  }[] = []
  let skipped = 0

  const cur = new Date(from)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setUTCHours(0, 0, 0, 0)

  while (cur <= end) {
    if (daysOfWeek.includes(cur.getUTCDay())) {
      const conflicts = await findConflicts({
        patientId,
        therapistId,
        date: new Date(cur),
        startTime,
        endTime,
      })
      if (conflicts.length > 0) {
        skipped++
      } else {
        toCreate.push({
          stayId: activeStay.id,
          patientId,
          procedureId,
          therapistId,
          date: new Date(cur),
          startTime,
          endTime,
          note: note || null,
        })
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  if (toCreate.length > 0) {
    await prisma.procedureSchedule.createMany({ data: toCreate })
  }

  revalidateAll()
  revalidatePath(`/pacienti/${patientId}/pobyt`)
  return { success: true, created: toCreate.length, skipped }
}

export async function getDaySchedules(date: Date) {
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCHours(23, 59, 59, 999)

  return prisma.procedureSchedule.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' }, deletedAt: null },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ therapistId: 'asc' }, { startTime: 'asc' }],
  })
}
