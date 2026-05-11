'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/modules/core/db/prisma'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'
import { checkPermission } from '@/modules/core/rbac'

const ProcedureSchema = z.object({
  name: z.string().min(1, 'Název je povinný'),
  category: z.string().min(1, 'Kategorie je povinná'),
  durationMin: z.coerce.number().int().min(5, 'Minimálně 5 minut'),
  description: z.string().optional(),
  building: z.string().optional(),
  room: z.string().optional(),
})

export async function getProcedures() {
  return prisma.procedure.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function getAllProcedures() {
  return prisma.procedure.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })
}

export async function createProcedure(formData: FormData) {
  const deny = await checkPermission('procedure.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = ProcedureSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { name, category, durationMin, description, building, room } = parsed.data
  const procedure = await prisma.procedure.create({
    data: {
      name,
      category,
      durationMin,
      description: description || null,
      building: building || null,
      room: room || null,
    },
  })
  await writeAuditLog({
    action: 'procedure.create',
    entity: 'Procedure',
    entityId: procedure.id,
    after: { name, category },
  })
  revalidatePath('/procedury')
  return { success: true }
}

export async function updateProcedure(id: string, formData: FormData) {
  const deny = await checkPermission('procedure.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = ProcedureSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { name, category, durationMin, description, building, room } = parsed.data
  await prisma.procedure.update({
    where: { id },
    data: {
      name,
      category,
      durationMin,
      description: description || null,
      building: building || null,
      room: room || null,
    },
  })
  await writeAuditLog({
    action: 'procedure.update',
    entity: 'Procedure',
    entityId: id,
    after: { name, category },
  })
  revalidatePath('/procedury')
  return { success: true }
}

export async function toggleProcedureActive(id: string) {
  const deny = await checkPermission('procedure.write')
  if (deny) return

  const p = await prisma.procedure.findUnique({ where: { id } })
  if (!p) return
  await prisma.procedure.update({ where: { id }, data: { isActive: !p.isActive } })
  revalidatePath('/procedury')
}
