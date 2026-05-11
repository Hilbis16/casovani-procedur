'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hash } from '@node-rs/argon2'
import { prisma } from '@/lib/prisma'
import { checkPermission } from '@/modules/core/rbac'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'

export async function getAdminUsers() {
  const deny = await checkPermission('user.read')
  if (deny) return []
  return prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getRoles() {
  return prisma.role.findMany({
    include: { permissions: true },
    orderBy: { key: 'asc' },
  })
}

const CreateUserSchema = z.object({
  email: z.string().email('Neplatný email'),
  fullName: z.string().min(1, 'Jméno je povinné'),
  password: z.string().min(8, 'Heslo musí mít alespoň 8 znaků'),
  roleId: z.string().min(1, 'Role je povinná'),
})

export async function createAdminUser(formData: FormData) {
  const deny = await checkPermission('user.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = CreateUserSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { email, fullName, password, roleId } = parsed.data
  const passwordHash = await hash(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { success: false, error: 'Email je již použit' }

  const user = await prisma.user.create({ data: { email, fullName, passwordHash } })
  await prisma.userRole.create({ data: { userId: user.id, roleId } })
  await writeAuditLog({
    action: 'user.create',
    entity: 'User',
    entityId: user.id,
    after: { email, fullName },
  })
  revalidatePath('/spravce/uzivatele')
  return { success: true }
}

export async function toggleUserActive(id: string) {
  const deny = await checkPermission('user.write')
  if (deny) return deny

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return { success: false, error: 'Uživatel nenalezen' }

  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } })
  await writeAuditLog({
    action: user.isActive ? 'user.deactivate' : 'user.activate',
    entity: 'User',
    entityId: id,
  })
  revalidatePath('/spravce/uzivatele')
  return { success: true }
}

export async function getAuditLogs(page = 1, pageSize = 50) {
  const deny = await checkPermission('audit.read')
  if (deny) return { items: [], total: 0 }

  const skip = (page - 1) * pageSize
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: pageSize,
      include: { actor: { select: { email: true, fullName: true } } },
      orderBy: { occurredAt: 'desc' },
    }),
    prisma.auditLog.count(),
  ])
  return { items, total }
}
