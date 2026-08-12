import { prisma } from '@/modules/core/db/prisma'

export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (!secret || secret !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const result = await prisma.procedureSchedule.updateMany({
    where: { status: 'planned', date: { lt: today }, deletedAt: null },
    data: { status: 'completed' },
  })

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: 'cron.auto_close_schedules',
      entity: 'ProcedureSchedule',
      meta: { count: result.count, runAt: new Date().toISOString() },
    },
  })

  return Response.json({ success: true, updated: result.count })
}
