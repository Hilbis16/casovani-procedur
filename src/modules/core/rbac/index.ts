import { auth } from '@/auth'
import { prisma } from '@/modules/core/db/prisma'

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  lekar: [
    'patient.read',
    'patient.write',
    'schedule.read',
    'schedule.write',
    'schedule.delete',
    'schedule.status',
    'procedure.read',
    'procedure.write',
    'therapist.read',
    'prescription.read',
    'prescription.write',
    'billing.read',
    'billing.write',
  ],
  terapeut: [
    'patient.read',
    'schedule.read',
    'schedule.write',
    'schedule.status',
    'procedure.read',
    'therapist.read',
  ],
  recepcni: [
    'patient.read',
    'patient.write',
    'schedule.read',
    'schedule.write',
    'procedure.read',
    'therapist.read',
    'prescription.read',
    'prescription.write',
    'billing.read',
    'billing.write',
  ],
  auditor: ['audit.read', 'prescription.read', 'billing.read'],
}

export async function checkPermission(
  action: string
): Promise<{ success: false; error: string } | null> {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Nepřihlášen' }

  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: { include: { permissions: true } } },
  })

  const hasPermission = userRoles.some((ur) =>
    ur.role.permissions.some((p) => p.action === '*' || p.action === action)
  )

  if (!hasPermission) return { success: false, error: 'Nedostatečná oprávnění' }
  return null
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: true } } },
  })

  const perms = new Set<string>()
  for (const ur of userRoles) {
    for (const p of ur.role.permissions) {
      perms.add(p.action)
    }
  }
  return Array.from(perms)
}
