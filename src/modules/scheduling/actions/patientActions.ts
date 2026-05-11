'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/modules/core/db/prisma'
import { writeAuditLog } from '@/modules/core/audit/auditLogger'
import { checkPermission } from '@/modules/core/rbac'

const PatientSchema = z.object({
  firstName: z.string().min(1, 'Jméno je povinné'),
  lastName: z.string().min(1, 'Příjmení je povinné'),
  arrivalDate: z.string().min(1, 'Datum příjezdu je povinné'),
  departureDate: z.string().min(1, 'Datum odjezdu je povinné'),
  note: z.string().optional(),
})

const UpdatePatientSchema = z.object({
  firstName: z.string().min(1, 'Jméno je povinné'),
  lastName: z.string().min(1, 'Příjmení je povinné'),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
  note: z.string().optional(),
})

export async function getPatients(query?: string) {
  return prisma.patient.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      stays: {
        where: { deletedAt: null },
        orderBy: { arrivalDate: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastName: 'asc' },
  })
}

export async function getPatient(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: {
      stays: {
        where: { deletedAt: null },
        orderBy: { arrivalDate: 'desc' },
        take: 1,
        include: { room: { include: { building: true } } },
      },
    },
  })
}

export async function createPatient(formData: FormData) {
  const deny = await checkPermission('patient.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = PatientSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { firstName, lastName, arrivalDate, departureDate, note } = parsed.data

  const patient = await prisma.patient.create({
    data: { firstName, lastName, note: note || null },
  })

  const year = new Date().getFullYear()
  const count = await prisma.stay.count()
  const code = `${year}-${String(count + 1).padStart(4, '0')}`

  await prisma.stay.create({
    data: {
      code,
      patientId: patient.id,
      arrivalDate: new Date(arrivalDate),
      departureDate: new Date(departureDate),
      status: 'planned',
    },
  })

  await writeAuditLog({
    action: 'patient.create',
    entity: 'Patient',
    entityId: patient.id,
    after: { firstName, lastName },
  })
  revalidatePath('/pacienti')
  return { success: true, id: patient.id }
}

export async function updatePatient(id: string, formData: FormData) {
  const deny = await checkPermission('patient.write')
  if (deny) return deny

  const raw = Object.fromEntries(formData)
  const parsed = UpdatePatientSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { firstName, lastName, arrivalDate, departureDate, note } = parsed.data

  await prisma.patient.update({
    where: { id },
    data: { firstName, lastName, note: note || null },
  })

  if (arrivalDate && departureDate) {
    const activeStay = await prisma.stay.findFirst({
      where: { patientId: id, deletedAt: null },
      orderBy: { arrivalDate: 'desc' },
    })
    if (activeStay) {
      await prisma.stay.update({
        where: { id: activeStay.id },
        data: { arrivalDate: new Date(arrivalDate), departureDate: new Date(departureDate) },
      })
    }
  }

  await writeAuditLog({
    action: 'patient.update',
    entity: 'Patient',
    entityId: id,
    after: { firstName, lastName },
  })
  revalidatePath('/pacienti')
  revalidatePath(`/pacienti/${id}`)
  return { success: true }
}

export async function deletePatient(id: string) {
  const deny = await checkPermission('patient.delete')
  if (deny) return deny

  await prisma.patient.delete({ where: { id } })
  await writeAuditLog({ action: 'patient.delete', entity: 'Patient', entityId: id })
  revalidatePath('/pacienti')
  return { success: true }
}
