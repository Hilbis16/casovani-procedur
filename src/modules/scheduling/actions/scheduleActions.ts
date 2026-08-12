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
  revalidatePath('/prehled')
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
    procedureId,
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
    procedureId,
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

  const existing = await prisma.procedureSchedule.findUnique({
    where: { id },
    select: { billedAt: true },
  })
  if (existing?.billedAt) {
    return { success: false as const, error: 'Procedura je vykázána – stav nelze měnit' }
  }

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

export async function moveSchedule(
  id: string,
  newDate: Date,
  newStartTime: string,
  durationMin: number
) {
  const deny = await checkPermission('schedule.write')
  if (deny) return deny

  const existing = await prisma.procedureSchedule.findUnique({
    where: { id },
    select: { patientId: true, procedureId: true, therapistId: true, billedAt: true },
  })
  if (!existing) return { success: false as const, error: 'Procedura nenalezena' }
  if (existing.billedAt) {
    return { success: false as const, error: 'Vykázaná procedura nelze přesunout' }
  }

  const newEndTime = addMinutes(newStartTime, durationMin)
  const dateObj = new Date(newDate)
  dateObj.setUTCHours(0, 0, 0, 0)

  const conflicts = await findConflicts({
    therapistId: existing.therapistId,
    patientId: existing.patientId,
    procedureId: existing.procedureId,
    date: dateObj,
    startTime: newStartTime,
    endTime: newEndTime,
    excludeScheduleId: id,
  })

  await prisma.procedureSchedule.update({
    where: { id },
    data: { date: dateObj, startTime: newStartTime, endTime: newEndTime },
  })
  await writeAuditLog({
    action: 'schedule.move',
    entity: 'ProcedureSchedule',
    entityId: id,
    after: { date: dateObj.toISOString().slice(0, 10), startTime: newStartTime },
  })
  revalidateAll()
  return { success: true as const, conflicts }
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
        procedureId: data.procedureId,
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

  const recurringGroupId = crypto.randomUUID()

  const toCreate: {
    stayId: string
    patientId: string
    procedureId: string
    therapistId: string
    recurringGroupId: string
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
        procedureId,
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
          recurringGroupId,
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

export async function createBatchSchedules(data: {
  patientId: string
  stayId: string
  items: { procedureId: string; therapistId: string; count: number; preferredTime: string }[]
}): Promise<{ success: boolean; created: number; skipped: number; error?: string }> {
  const deny = await checkPermission('schedule.write')
  if (deny) return { ...deny, created: 0, skipped: 0 }

  const stay = await prisma.stay.findUnique({ where: { id: data.stayId } })
  if (!stay) return { success: false, created: 0, skipped: 0, error: 'Pobyt nenalezen' }

  const weekdays: Date[] = []
  const cur = new Date(stay.arrivalDate)
  cur.setUTCHours(0, 0, 0, 0)
  const stayEnd = new Date(stay.departureDate)
  stayEnd.setUTCHours(0, 0, 0, 0)
  while (cur <= stayEnd) {
    const dow = cur.getUTCDay()
    if (dow >= 1 && dow <= 5) weekdays.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  if (weekdays.length === 0)
    return { success: false, created: 0, skipped: 0, error: 'Pobyt nemá pracovní dny' }

  const toCreate: {
    stayId: string
    patientId: string
    procedureId: string
    therapistId: string
    date: Date
    startTime: string
    endTime: string
    note: null
  }[] = []
  let skipped = 0

  for (const item of data.items) {
    const procedure = await prisma.procedure.findUnique({ where: { id: item.procedureId } })
    if (!procedure) {
      skipped += item.count
      continue
    }

    const endTime = addMinutes(item.preferredTime, procedure.durationMin)
    const count = Math.min(item.count, weekdays.length)
    const stride = weekdays.length / count

    for (let i = 0; i < count; i++) {
      const dayIndex = Math.min(Math.floor(i * stride), weekdays.length - 1)
      const date = weekdays[dayIndex]

      const conflicts = await findConflicts({
        patientId: data.patientId,
        therapistId: item.therapistId,
        procedureId: item.procedureId,
        date,
        startTime: item.preferredTime,
        endTime,
      })
      if (conflicts.length > 0) {
        skipped++
      } else {
        toCreate.push({
          stayId: data.stayId,
          patientId: data.patientId,
          procedureId: item.procedureId,
          therapistId: item.therapistId,
          date: new Date(date),
          startTime: item.preferredTime,
          endTime,
          note: null,
        })
      }
    }
  }

  if (toCreate.length > 0) {
    await prisma.procedureSchedule.createMany({ data: toCreate })
  }

  revalidateAll()
  revalidatePath(`/pacienti/${data.patientId}/pobyt`)
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

// SE-5: cancel an entire recurring series (or all from a given date forward)
// scope 'from_here' → only date >= fromDate; scope 'all' → entire series
// Only cancels planned/confirmed; skips billed records
export async function cancelSeriesFrom(
  groupId: string,
  fromDate: string,
  scope: 'from_here' | 'all'
): Promise<{ success: boolean; cancelled: number; skipped: number; error?: string }> {
  const deny = await checkPermission('schedule.write')
  if (deny) return { ...deny, cancelled: 0, skipped: 0 }

  if (!groupId) return { success: false, cancelled: 0, skipped: 0, error: 'Chybí ID série' }

  const fromDateObj = new Date(fromDate)
  fromDateObj.setUTCHours(0, 0, 0, 0)

  const dateFilter = scope === 'from_here' ? { gte: fromDateObj } : undefined

  const targets = await prisma.procedureSchedule.findMany({
    where: {
      recurringGroupId: groupId,
      status: { in: ['planned', 'confirmed'] },
      billedAt: null,
      deletedAt: null,
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    select: { id: true },
  })

  const billedCount = await prisma.procedureSchedule.count({
    where: {
      recurringGroupId: groupId,
      billedAt: { not: null },
      ...(dateFilter ? { date: dateFilter } : {}),
    },
  })

  if (targets.length === 0) {
    return { success: true, cancelled: 0, skipped: billedCount }
  }

  const ids = targets.map((t) => t.id)
  await prisma.procedureSchedule.updateMany({
    where: { id: { in: ids } },
    data: { status: 'cancelled' },
  })

  await writeAuditLog({
    action: 'schedule.series_cancel',
    entity: 'ProcedureSchedule',
    meta: { recurringGroupId: groupId, scope, fromDate, count: ids.length },
  })

  revalidateAll()
  return { success: true, cancelled: ids.length, skipped: billedCount }
}
