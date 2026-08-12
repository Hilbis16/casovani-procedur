import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/modules/core/db/prisma', () => ({
  prisma: {
    stay: { findUnique: vi.fn() },
    procedure: { findMany: vi.fn() },
    prescriptionTemplate: { findMany: vi.fn() },
  },
}))

vi.mock('@/modules/scheduling/lib/conflictDetection', () => ({
  findConflicts: vi.fn(),
}))

vi.mock('@/modules/core/rbac', () => ({
  checkPermission: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'doctor-1' } }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/modules/core/audit/auditLogger', () => ({
  writeAuditLog: vi.fn(),
}))

import { previewPrescription } from './prescriptionActions'
import { prisma } from '@/modules/core/db/prisma'
import { findConflicts } from '@/modules/scheduling/lib/conflictDetection'

const mockStayFindUnique = vi.mocked(prisma.stay.findUnique)
const mockProcedureFindMany = vi.mocked(prisma.procedure.findMany)
const mockFindConflicts = vi.mocked(findConflicts)

// Stay 14 dnů: Po 4.5. → Po 18.5. (2026 — sanity: 4.5.2026 je Po, ověřeno)
const ARRIVAL = new Date('2026-05-04T00:00:00.000Z') // Pondělí
const DEPARTURE = new Date('2026-05-17T00:00:00.000Z') // Neděle (14 dnů → 10 weekdays)

const baseStay = {
  id: 'stay-1',
  patientId: 'patient-1',
  arrivalDate: ARRIVAL,
  departureDate: DEPARTURE,
}

beforeEach(() => {
  mockStayFindUnique.mockResolvedValue(baseStay as never)
  mockProcedureFindMany.mockResolvedValue([
    { id: 'proc-massage', name: 'Klasická masáž', durationMin: 60, capacity: 1 },
  ] as never)
  mockFindConflicts.mockResolvedValue([])
})

describe('previewPrescription', () => {
  it('rovnoměrně rozprostře procedury přes pracovní dny pobytu', async () => {
    // 10 weekdays, 5 repetitions → stride = 2, indexy 0,2,4,6,8
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 5,
          preferredTime: '09:00',
        },
      ],
    })

    expect(result.error).toBeUndefined()
    expect(result.proposals).toHaveLength(5)
    expect(result.proposals.map((p) => p.occurrence)).toEqual([1, 2, 3, 4, 5])

    // Indexy weekdays: 0=Po4.5, 1=Út5.5, 2=St6.5, 3=Čt7.5, 4=Pá8.5, 5=Po11.5, 6=Út12.5, 7=St13.5, 8=Čt14.5, 9=Pá15.5
    const dates = result.proposals.map((p) => p.date.toISOString().slice(0, 10))
    expect(dates).toEqual(['2026-05-04', '2026-05-06', '2026-05-08', '2026-05-12', '2026-05-14'])
  })

  it('počítá endTime z durationMin procedury', async () => {
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 1,
          preferredTime: '09:00',
        },
      ],
    })
    expect(result.proposals[0].startTime).toBe('09:00')
    expect(result.proposals[0].endTime).toBe('10:00') // 60 min
    expect(result.proposals[0].durationMin).toBe(60)
  })

  it('propaguje konflikty z findConflicts do proposalu', async () => {
    mockFindConflicts
      .mockResolvedValueOnce([
        { type: 'therapist', message: 'Terapeut zaneprázdněn', scheduleId: 's1' },
      ])
      .mockResolvedValue([])

    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 2,
          preferredTime: '09:00',
        },
      ],
    })

    expect(result.proposals).toHaveLength(2)
    expect(result.proposals[0].conflicts).toHaveLength(1)
    expect(result.proposals[0].conflicts[0].type).toBe('therapist')
    expect(result.proposals[1].conflicts).toHaveLength(0)
  })

  it('aplikuje skip adjustment — daný slot se vynechá', async () => {
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 3,
          preferredTime: '09:00',
        },
      ],
      adjustments: [{ itemIndex: 0, occurrence: 2, action: 'skip' }],
    })

    expect(result.proposals).toHaveLength(2)
    expect(result.proposals.map((p) => p.occurrence)).toEqual([1, 3])
  })

  it('aplikuje move adjustment — přesune termín i terapeuta', async () => {
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 1,
          preferredTime: '09:00',
        },
      ],
      adjustments: [
        {
          itemIndex: 0,
          occurrence: 1,
          action: 'move',
          newDate: '2026-05-13',
          newTime: '14:00',
          newTherapistId: 'ther-2',
        },
      ],
    })

    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].date.toISOString().slice(0, 10)).toBe('2026-05-13')
    expect(result.proposals[0].startTime).toBe('14:00')
    expect(result.proposals[0].endTime).toBe('15:00')
    expect(result.proposals[0].therapistId).toBe('ther-2')
  })

  it('vrátí chybu pro neexistující pobyt', async () => {
    mockStayFindUnique.mockResolvedValue(null)
    const result = await previewPrescription({
      stayId: 'missing',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 1,
          preferredTime: '09:00',
        },
      ],
    })
    expect(result.error).toBe('Pobyt nenalezen')
    expect(result.proposals).toEqual([])
  })

  it('vrátí chybu pro pobyt bez pracovních dnů (jen víkend)', async () => {
    // Sobota → Neděle (2 dny, oba víkend)
    mockStayFindUnique.mockResolvedValue({
      ...baseStay,
      arrivalDate: new Date('2026-05-02T00:00:00.000Z'),
      departureDate: new Date('2026-05-03T00:00:00.000Z'),
    } as never)
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 1,
          preferredTime: '09:00',
        },
      ],
    })
    expect(result.error).toBe('Pobyt nemá pracovní dny')
  })

  it('limituje repetitions na počet weekday slotů', async () => {
    // 10 weekdays, request 20 → max 10
    const result = await previewPrescription({
      stayId: 'stay-1',
      items: [
        {
          procedureId: 'proc-massage',
          therapistId: 'ther-1',
          repetitions: 20,
          preferredTime: '09:00',
        },
      ],
    })
    expect(result.proposals).toHaveLength(10)
  })
})
