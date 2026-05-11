import { prisma } from '@/modules/core/db/prisma'

export async function getPatientFullData(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      stays: {
        include: { room: true },
      },
      schedules: {
        include: {
          procedure: true,
          therapist: true,
          procedureRoom: true,
        },
      },
    },
  })

  if (!patient) throw new Error('Patient not found')

  return {
    patient,
    timestamp: new Date().toISOString(),
    facilityName: 'Lázeňské zařízení', // Potenciálně fetchovat z configu
  }
}
