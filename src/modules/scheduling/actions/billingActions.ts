'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/modules/core/db/prisma'
import { checkPermission } from '@/modules/core/rbac'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'

function monthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return { from, to }
}

const scheduleInclude = {
  patient: { select: { id: true, firstName: true, lastName: true } },
  procedure: {
    select: {
      id: true,
      name: true,
      category: true,
      durationMin: true,
      insuranceCode: true,
    },
  },
  therapist: { select: { id: true, firstName: true, lastName: true } },
} as const

export async function getBillingPageData(year: number, month: number) {
  const { from, to } = monthRange(year, month)

  const [period, billable, billed] = await Promise.all([
    prisma.billingPeriod.findUnique({ where: { year_month: { year, month } } }),
    prisma.procedureSchedule.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { in: ['completed', 'no_show'] },
        billedAt: null,
        deletedAt: null,
      },
      include: scheduleInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
    prisma.procedureSchedule.findMany({
      where: {
        date: { gte: from, lte: to },
        billedAt: { not: null },
        deletedAt: null,
      },
      include: scheduleInclude,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    }),
  ])

  return { period, billable, billed }
}

export async function markAllAsBilled(year: number, month: number) {
  const deny = await checkPermission('billing.write')
  if (deny) return deny

  const { from, to } = monthRange(year, month)

  const period = await prisma.billingPeriod.upsert({
    where: { year_month: { year, month } },
    create: { year, month, status: 'open' },
    update: {},
  })

  if (period.status === 'locked') {
    return { success: false as const, error: 'Výkazové období je zamčeno' }
  }

  const now = new Date()
  const result = await prisma.procedureSchedule.updateMany({
    where: {
      date: { gte: from, lte: to },
      status: { in: ['completed', 'no_show'] },
      billedAt: null,
      deletedAt: null,
    },
    data: { billedAt: now, billingPeriodId: period.id },
  })

  await writeAuditLog({
    action: 'billing.mark_billed',
    entity: 'BillingPeriod',
    entityId: period.id,
    after: { year, month, count: result.count },
  })

  revalidatePath('/vykaz')
  return { success: true as const, count: result.count }
}

export async function submitBillingPeriod(year: number, month: number) {
  const deny = await checkPermission('billing.write')
  if (deny) return deny

  const period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  })
  if (!period) return { success: false as const, error: 'Výkazové období nenalezeno' }
  if (period.status !== 'open') {
    return { success: false as const, error: 'Lze odeslat pouze otevřené období' }
  }

  await prisma.billingPeriod.update({
    where: { id: period.id },
    data: { status: 'submitted', submittedAt: new Date() },
  })

  await writeAuditLog({
    action: 'billing.submit_period',
    entity: 'BillingPeriod',
    entityId: period.id,
    after: { year, month, status: 'submitted' },
  })

  revalidatePath('/vykaz')
  return { success: true as const }
}

export async function lockBillingPeriod(year: number, month: number) {
  const deny = await checkPermission('billing.write')
  if (deny) return deny

  const period = await prisma.billingPeriod.findUnique({
    where: { year_month: { year, month } },
  })
  if (!period) return { success: false as const, error: 'Výkazové období nenalezeno' }
  if (period.status !== 'submitted') {
    return { success: false as const, error: 'Lze zamknout pouze odeslané období' }
  }

  await prisma.billingPeriod.update({
    where: { id: period.id },
    data: { status: 'locked', lockedAt: new Date() },
  })

  await writeAuditLog({
    action: 'billing.lock_period',
    entity: 'BillingPeriod',
    entityId: period.id,
    after: { year, month, status: 'locked' },
  })

  revalidatePath('/vykaz')
  return { success: true as const }
}

export async function exportBillingCsv(
  year: number,
  month: number
): Promise<{ success: true; csv: string; fileName: string } | { success: false; error: string }> {
  const deny = await checkPermission('billing.read')
  if (deny) return { success: false, error: deny.error }

  const { from, to } = monthRange(year, month)

  const schedules = await prisma.procedureSchedule.findMany({
    where: { date: { gte: from, lte: to }, billedAt: { not: null }, deletedAt: null },
    include: scheduleInclude,
    orderBy: [{ date: 'asc' }, { patient: { lastName: 'asc' } }],
  })

  const STATUS_CZ: Record<string, string> = {
    completed: 'Absolvováno',
    no_show: 'Nedostavil se',
    cancelled: 'Zrušeno',
    planned: 'Naplánováno',
    confirmed: 'Potvrzeno',
  }

  const header = 'Datum;Pacient;Procedura;Kód pojišťovny;Terapeut;Trvání (min);Stav;Vykázáno'
  const rows = schedules.map((s) =>
    [
      s.date.toISOString().slice(0, 10),
      `${s.patient.lastName} ${s.patient.firstName}`,
      s.procedure.name,
      s.procedure.insuranceCode ?? '',
      `${s.therapist.lastName} ${s.therapist.firstName}`,
      s.procedure.durationMin,
      STATUS_CZ[s.status] ?? s.status,
      s.billedAt?.toISOString().slice(0, 10) ?? '',
    ].join(';')
  )

  const csv = [header, ...rows].join('\r\n')
  const fileName = `vykaz-${year}-${String(month).padStart(2, '0')}.csv`
  return { success: true, csv, fileName }
}
