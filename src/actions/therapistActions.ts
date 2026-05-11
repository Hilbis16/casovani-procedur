'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'
import { checkPermission } from '@/modules/core/rbac'

const TherapistSchema = z.object({
  firstName: z.string().min(1, 'Jméno je povinné'),
  lastName: z.string().min(1, 'Příjmení je povinné'),
  phone: z.string().optional(),
  color: z.string().default('#3B82F6'),
})

export async function getTherapists() {
  return prisma.therapist.findMany({
    where: { isActive: true },
    include: { availabilities: true },
    orderBy: { lastName: 'asc' },
  })
}

export async function getAllTherapists() {
  return prisma.therapist.findMany({
    include: { availabilities: true },
    orderBy: { lastName: 'asc' },
  })
}

export async function getTherapist(id: number) {
  return prisma.therapist.findUnique({
    where: { id },
    include: { availabilities: true },
  })
}

export async function createTherapist(formData: FormData) {
  const deny = await checkPermission('therapist.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = TherapistSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { firstName, lastName, phone, color } = parsed.data
  const therapist = await prisma.therapist.create({
    data: { firstName, lastName, phone: phone || null, color },
  })
  await prisma.therapistAvailability.createMany({
    data: [1, 2, 3, 4, 5].map((d) => ({
      therapistId: therapist.id,
      dayOfWeek: d,
      startTime: '08:00',
      endTime: '16:00',
    })),
  })
  await writeAuditLog({
    action: 'therapist.create',
    entity: 'Therapist',
    entityId: therapist.id,
    after: { firstName, lastName },
  })
  revalidatePath('/terapeuti')
  return { success: true }
}

export async function updateTherapist(id: number, formData: FormData) {
  const deny = await checkPermission('therapist.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = TherapistSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { firstName, lastName, phone, color } = parsed.data
  await prisma.therapist.update({
    where: { id },
    data: { firstName, lastName, phone: phone || null, color },
  })
  await writeAuditLog({
    action: 'therapist.update',
    entity: 'Therapist',
    entityId: id,
    after: { firstName, lastName },
  })
  revalidatePath('/terapeuti')
  revalidatePath(`/terapeuti/${id}`)
  return { success: true }
}

export async function toggleTherapistActive(id: number) {
  const deny = await checkPermission('therapist.write')
  if (deny) return

  const t = await prisma.therapist.findUnique({ where: { id } })
  if (!t) return
  await prisma.therapist.update({ where: { id }, data: { isActive: !t.isActive } })
  revalidatePath('/terapeuti')
}

export async function deleteTherapist(id: number) {
  const deny = await checkPermission('therapist.write')
  if (deny) return deny

  await prisma.therapist.delete({ where: { id } })
  await writeAuditLog({ action: 'therapist.delete', entity: 'Therapist', entityId: id })
  revalidatePath('/terapeuti')
  return { success: true }
}
