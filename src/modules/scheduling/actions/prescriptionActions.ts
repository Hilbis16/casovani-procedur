'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/modules/core/db/prisma'
import {
  findConflicts,
  findFreeSlots,
  type ConflictResult,
} from '@/modules/scheduling/lib/conflictDetection'
import { addMinutes } from '@/modules/core/lib/dateUtils'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'
import { checkPermission } from '@/modules/core/rbac'
import { auth } from '@/auth'

export interface ProposalSlot {
  itemIndex: number
  occurrence: number
  date: Date
  startTime: string
  endTime: string
  procedureId: string
  therapistId: string
  durationMin: number
  conflicts: ConflictResult[]
}

const PrescriptionItemInputSchema = z.object({
  procedureId: z.string().min(1),
  therapistId: z.string().min(1),
  repetitions: z.coerce.number().int().min(1).max(50),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
})

const PreviewInputSchema = z.object({
  stayId: z.string().min(1),
  items: z.array(PrescriptionItemInputSchema).min(1),
})

const AdjustmentSchema = z.object({
  itemIndex: z.number().int().min(0),
  occurrence: z.number().int().min(1),
  action: z.enum(['skip', 'move']),
  newDate: z.string().optional(),
  newTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  newTherapistId: z.string().optional(),
})

const CreateInputSchema = z.object({
  stayId: z.string().min(1),
  templateId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(PrescriptionItemInputSchema).min(1),
  adjustments: z.array(AdjustmentSchema).optional(),
})

export type PrescriptionItemInput = z.infer<typeof PrescriptionItemInputSchema>
export type PrescriptionAdjustment = z.infer<typeof AdjustmentSchema>

function weekdaysBetween(arrival: Date, departure: Date): Date[] {
  const days: Date[] = []
  const cur = new Date(arrival)
  cur.setUTCHours(0, 0, 0, 0)
  const end = new Date(departure)
  end.setUTCHours(0, 0, 0, 0)
  while (cur <= end) {
    const dow = cur.getUTCDay()
    if (dow >= 1 && dow <= 5) days.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
}

export async function getPrescriptionTemplates() {
  const deny = await checkPermission('prescription.read')
  if (deny) return []
  return prisma.prescriptionTemplate.findMany({
    where: { isActive: true },
    include: {
      items: {
        include: { procedure: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })
}

async function buildProposals(
  stayId: string,
  items: PrescriptionItemInput[],
  adjustments: PrescriptionAdjustment[] = []
): Promise<{ proposals: ProposalSlot[]; error?: string }> {
  const stay = await prisma.stay.findUnique({ where: { id: stayId } })
  if (!stay) return { proposals: [], error: 'Pobyt nenalezen' }

  const weekdays = weekdaysBetween(stay.arrivalDate, stay.departureDate)
  if (weekdays.length === 0) return { proposals: [], error: 'Pobyt nemá pracovní dny' }

  const adjMap = new Map<string, PrescriptionAdjustment>()
  for (const a of adjustments) adjMap.set(`${a.itemIndex}:${a.occurrence}`, a)

  const procIds = Array.from(new Set(items.map((i) => i.procedureId)))
  const procedures = await prisma.procedure.findMany({ where: { id: { in: procIds } } })
  const procById = new Map(procedures.map((p) => [p.id, p]))

  const proposals: ProposalSlot[] = []

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const item = items[itemIndex]
    const procedure = procById.get(item.procedureId)
    if (!procedure) continue

    const count = Math.min(item.repetitions, weekdays.length)
    const stride = weekdays.length / count

    for (let i = 0; i < count; i++) {
      const occurrence = i + 1
      const adj = adjMap.get(`${itemIndex}:${occurrence}`)
      if (adj?.action === 'skip') continue

      const dayIndex = Math.min(Math.floor(i * stride), weekdays.length - 1)
      const date =
        adj?.action === 'move' && adj.newDate ? new Date(adj.newDate) : new Date(weekdays[dayIndex])
      date.setUTCHours(0, 0, 0, 0)

      const startTime = adj?.action === 'move' && adj.newTime ? adj.newTime : item.preferredTime
      const therapistId =
        adj?.action === 'move' && adj.newTherapistId ? adj.newTherapistId : item.therapistId
      const endTime = addMinutes(startTime, procedure.durationMin)

      const conflicts = await findConflicts({
        patientId: stay.patientId,
        therapistId,
        procedureId: item.procedureId,
        date,
        startTime,
        endTime,
      })

      proposals.push({
        itemIndex,
        occurrence,
        date,
        startTime,
        endTime,
        procedureId: item.procedureId,
        therapistId,
        durationMin: procedure.durationMin,
        conflicts,
      })
    }
  }

  return { proposals }
}

export async function previewPrescription(input: {
  stayId: string
  items: PrescriptionItemInput[]
  adjustments?: PrescriptionAdjustment[]
}): Promise<{ proposals: ProposalSlot[]; error?: string }> {
  const deny = await checkPermission('prescription.read')
  if (deny) return { proposals: [], error: deny.error }

  const parsed = PreviewInputSchema.safeParse({ stayId: input.stayId, items: input.items })
  if (!parsed.success) return { proposals: [], error: parsed.error.issues[0].message }

  return buildProposals(parsed.data.stayId, parsed.data.items, input.adjustments ?? [])
}

export async function createPrescription(input: {
  stayId: string
  templateId?: string
  notes?: string
  items: PrescriptionItemInput[]
  adjustments?: PrescriptionAdjustment[]
}): Promise<{
  success: boolean
  prescriptionId?: string
  created: number
  skipped: number
  error?: string
}> {
  const deny = await checkPermission('prescription.write')
  if (deny) return { success: false, created: 0, skipped: 0, error: deny.error }

  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, created: 0, skipped: 0, error: 'Nepřihlášen' }
  }

  const parsed = CreateInputSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, created: 0, skipped: 0, error: parsed.error.issues[0].message }
  }
  const { stayId, templateId, notes, items, adjustments } = parsed.data

  const { proposals, error } = await buildProposals(stayId, items, adjustments ?? [])
  if (error) return { success: false, created: 0, skipped: 0, error }

  const stay = await prisma.stay.findUnique({ where: { id: stayId } })
  if (!stay) return { success: false, created: 0, skipped: 0, error: 'Pobyt nenalezen' }

  const skippedFromAdjustments = (adjustments ?? []).filter((a) => a.action === 'skip').length

  try {
    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.create({
        data: {
          stayId,
          patientId: stay.patientId,
          doctorId: session.user!.id!,
          templateId: templateId ?? null,
          notes: notes ?? null,
        },
      })

      const itemRows = await Promise.all(
        items.map((it) =>
          tx.prescriptionItem.create({
            data: {
              prescriptionId: prescription.id,
              procedureId: it.procedureId,
              therapistId: it.therapistId,
              repetitions: it.repetitions,
              preferredTime: it.preferredTime,
            },
          })
        )
      )

      const okProposals = proposals.filter((p) => p.conflicts.length === 0)
      const skippedDueToConflict = proposals.length - okProposals.length

      if (okProposals.length > 0) {
        await tx.procedureSchedule.createMany({
          data: okProposals.map((p) => ({
            stayId,
            patientId: stay.patientId,
            procedureId: p.procedureId,
            therapistId: p.therapistId,
            date: p.date,
            startTime: p.startTime,
            endTime: p.endTime,
            prescriptionItemId: itemRows[p.itemIndex].id,
          })),
        })

        const countByItem = new Map<number, number>()
        for (const p of okProposals)
          countByItem.set(p.itemIndex, (countByItem.get(p.itemIndex) ?? 0) + 1)
        for (const [itemIndex, cnt] of countByItem) {
          await tx.prescriptionItem.update({
            where: { id: itemRows[itemIndex].id },
            data: { createdSchedulesCount: cnt },
          })
        }
      }

      return {
        prescriptionId: prescription.id,
        created: okProposals.length,
        skipped: skippedDueToConflict + skippedFromAdjustments,
      }
    })

    await writeAuditLog({
      action: 'prescription.create',
      entity: 'Prescription',
      entityId: result.prescriptionId,
      after: {
        stayId,
        itemCount: items.length,
        created: result.created,
        skipped: result.skipped,
      },
    })

    revalidatePath('/planovani')
    revalidatePath('/pacienti')
    revalidatePath('/predpisy')
    revalidatePath('/prehled')

    return { success: true, ...result }
  } catch (e) {
    return {
      success: false,
      created: 0,
      skipped: 0,
      error: e instanceof Error ? e.message : 'Chyba při vytváření předpisu',
    }
  }
}

export async function getFreeSlotSuggestions(input: {
  stayId: string
  procedureId: string
  therapistId: string
  date: string
}): Promise<{ slots: { startTime: string }[]; error?: string }> {
  const deny = await checkPermission('prescription.read')
  if (deny) return { slots: [], error: deny.error }

  const stay = await prisma.stay.findUnique({ where: { id: input.stayId } })
  if (!stay) return { slots: [], error: 'Pobyt nenalezen' }

  const procedure = await prisma.procedure.findUnique({ where: { id: input.procedureId } })
  if (!procedure) return { slots: [], error: 'Procedura nenalezena' }

  const date = new Date(input.date)
  date.setUTCHours(0, 0, 0, 0)

  const times = await findFreeSlots({
    therapistId: input.therapistId,
    patientId: stay.patientId,
    date,
    durationMin: procedure.durationMin,
    procedureId: input.procedureId,
    maxResults: 8,
  })

  return { slots: times.map((startTime) => ({ startTime })) }
}

export async function getPrescriptions(stayId?: string) {
  const deny = await checkPermission('prescription.read')
  if (deny) return []

  return prisma.prescription.findMany({
    where: { deletedAt: null, ...(stayId ? { stayId } : {}) },
    include: {
      patient: true,
      stay: true,
      doctor: { select: { id: true, fullName: true, email: true } },
      template: true,
      items: {
        include: { procedure: true, therapist: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPrescription(id: string) {
  const deny = await checkPermission('prescription.read')
  if (deny) return null

  return prisma.prescription.findUnique({
    where: { id, deletedAt: null },
    include: {
      patient: true,
      stay: true,
      doctor: { select: { id: true, fullName: true, email: true } },
      template: true,
      items: {
        include: {
          procedure: true,
          therapist: true,
          schedules: {
            where: { deletedAt: null },
            include: { therapist: true, procedure: true },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          },
        },
      },
    },
  })
}

export async function cancelPrescription(
  id: string
): Promise<{ success: boolean; cancelledSchedules: number; error?: string }> {
  const deny = await checkPermission('prescription.write')
  if (deny) return { success: false, cancelledSchedules: 0, error: deny.error }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.prescription.findUnique({
        where: { id, deletedAt: null },
        include: { items: { select: { id: true } } },
      })
      if (!prescription) throw new Error('Předpis nenalezen')

      const itemIds = prescription.items.map((i) => i.id)
      const cancelled = await tx.procedureSchedule.updateMany({
        where: {
          prescriptionItemId: { in: itemIds },
          status: { not: 'cancelled' },
          deletedAt: null,
        },
        data: { status: 'cancelled' },
      })

      await tx.prescription.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return { cancelledSchedules: cancelled.count }
    })

    await writeAuditLog({
      action: 'prescription.cancel',
      entity: 'Prescription',
      entityId: id,
      after: { cancelledSchedules: result.cancelledSchedules },
    })

    revalidatePath('/planovani')
    revalidatePath('/predpisy')
    revalidatePath('/prehled')

    return { success: true, cancelledSchedules: result.cancelledSchedules }
  } catch (e) {
    return {
      success: false,
      cancelledSchedules: 0,
      error: e instanceof Error ? e.message : 'Chyba při rušení předpisu',
    }
  }
}
