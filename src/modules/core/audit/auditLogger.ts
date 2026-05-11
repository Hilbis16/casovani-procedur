import { prisma } from '@/modules/core/db/prisma'
import { auth } from '@/auth'
import { headers } from 'next/headers'

export interface AuditParams {
  action: string
  entity: string
  entityId?: string | number
  before?: unknown
  after?: unknown
  meta?: unknown
}

export async function writeAuditLog(params: AuditParams) {
  const session = await auth()
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    null

  await prisma.auditLog.create({
    data: {
      actorId: session?.user?.id ?? null,
      actorIp: ip,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId != null ? String(params.entityId) : null,
      before: params.before != null ? (params.before as object) : undefined,
      after: params.after != null ? (params.after as object) : undefined,
      meta: params.meta != null ? (params.meta as object) : undefined,
    },
  })
}
