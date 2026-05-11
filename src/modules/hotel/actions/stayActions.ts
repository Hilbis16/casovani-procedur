'use server'

import { prisma } from '@/modules/core/db/prisma'
import { checkPermission } from '@/modules/core/rbac'
import { revalidatePath } from 'next/cache'

export async function createStay(data: {
  patientId: string
  roomId?: string
  arrivalDate: Date
  departureDate: Date
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const deny = await checkPermission('patient.write')
  if (deny) return deny

  const year = new Date().getFullYear()
  const count = await prisma.stay.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  })
  const code = `${year}-${String(count + 1).padStart(4, '0')}`

  const stay = await prisma.stay.create({
    data: {
      code,
      ...data,
      status: 'planned',
    },
  })

  revalidatePath('/ubytovani')
  return { success: true, id: stay.id }
}

export async function getStays() {
  return prisma.stay.findMany({
    where: { deletedAt: null },
    include: { patient: true, room: true },
    orderBy: { arrivalDate: 'asc' },
  })
}

export async function getRooms() {
  return prisma.room.findMany({
    where: { isActive: true, kind: 'patient_room' },
    include: { building: true },
    orderBy: [{ building: { code: 'asc' } }, { number: 'asc' }],
  })
}
