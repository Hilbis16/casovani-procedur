'use server'

import { prisma } from '@/modules/core/db/prisma'
import { timeToMinutes } from '@/modules/core/lib/dateUtils'
import { CATEGORIES } from '@/lib/constants'

export async function getCapacityStats(from: Date, to: Date) {
  const [schedules, therapists] = await Promise.all([
    prisma.procedureSchedule.findMany({
      where: {
        date: { gte: from, lte: to },
        deletedAt: null,
        status: { not: 'cancelled' },
      },
      select: {
        id: true,
        date: true,
        status: true,
        patientId: true,
        procedure: { select: { durationMin: true, category: true } },
        therapist: {
          select: { id: true, firstName: true, lastName: true, color: true },
        },
      },
    }),
    prisma.therapist.findMany({
      where: { isActive: true },
      include: { availabilities: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),
  ])

  // All days in range
  const days: Date[] = []
  const cur = new Date(from)
  while (cur <= to) {
    days.push(new Date(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }

  // Therapist stats
  const therapistStats = therapists.map((t) => {
    const ts = schedules.filter((s) => s.therapist.id === t.id)

    const availableMinutes = days.reduce((sum, day) => {
      const dow = day.getUTCDay()
      const avail = t.availabilities.find((a) => a.dayOfWeek === dow)
      if (!avail) return sum
      return sum + timeToMinutes(avail.endTime) - timeToMinutes(avail.startTime)
    }, 0)

    const scheduledMinutes = ts.reduce((sum, s) => sum + s.procedure.durationMin, 0)
    const completedCount = ts.filter((s) => s.status === 'completed').length
    const noShowCount = ts.filter((s) => s.status === 'no_show').length
    const occupancyPct =
      availableMinutes > 0
        ? Math.min(100, Math.round((scheduledMinutes / availableMinutes) * 100))
        : null

    return {
      id: t.id,
      name: `${t.lastName} ${t.firstName}`,
      color: t.color,
      availableMinutes,
      scheduledMinutes,
      completedCount,
      noShowCount,
      totalCount: ts.length,
      occupancyPct,
    }
  })

  // Category breakdown
  const categoryMap = new Map<string, { count: number; minutes: number }>()
  for (const s of schedules) {
    const cat = s.procedure.category
    const cur = categoryMap.get(cat) ?? { count: 0, minutes: 0 }
    categoryMap.set(cat, { count: cur.count + 1, minutes: cur.minutes + s.procedure.durationMin })
  }
  const categoryStats = Object.entries(CATEGORIES)
    .map(([key, label]) => {
      const data = categoryMap.get(key) ?? { count: 0, minutes: 0 }
      return { key, label, ...data }
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

  // Daily counts
  const dailyMap = new Map<string, number>()
  for (const s of schedules) {
    const key = new Date(s.date).toISOString().slice(0, 10)
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
  }
  const dailyStats = days.map((d) => ({
    dateStr: d.toISOString().slice(0, 10),
    dow: d.getUTCDay(),
    count: dailyMap.get(d.toISOString().slice(0, 10)) ?? 0,
  }))

  // KPIs
  const uniquePatients = new Set(schedules.map((s) => s.patientId)).size
  const noShowCount = schedules.filter((s) => s.status === 'no_show').length
  const noShowRate = schedules.length > 0 ? Math.round((noShowCount / schedules.length) * 100) : 0
  const occupancyValues = therapistStats
    .filter((t) => t.occupancyPct !== null)
    .map((t) => t.occupancyPct!)
  const avgOccupancyPct =
    occupancyValues.length > 0
      ? Math.round(occupancyValues.reduce((a, b) => a + b, 0) / occupancyValues.length)
      : null

  return {
    therapistStats,
    categoryStats,
    dailyStats,
    kpis: {
      totalSchedules: schedules.length,
      uniquePatients,
      avgOccupancyPct,
      noShowRate,
    },
  }
}
