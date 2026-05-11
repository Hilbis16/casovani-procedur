import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing conflictDetection
vi.mock('./prisma', () => ({
  prisma: {
    procedureSchedule: {
      findMany: vi.fn(),
    },
    therapistAvailability: {
      findFirst: vi.fn(),
    },
    therapistTimeOff: {
      findMany: vi.fn(),
    },
  },
}))

import { findConflicts } from './conflictDetection'
import { prisma } from './prisma'

const mockFindMany = vi.mocked(prisma.procedureSchedule.findMany)
const mockAvailability = vi.mocked(prisma.therapistAvailability.findFirst)
const mockTimeOff = vi.mocked(prisma.therapistTimeOff.findMany)

const MON = new Date('2026-05-11') // Monday
MON.setUTCHours(0, 0, 0, 0)

// Default availability: Mon-Fri 07:00-15:00
const defaultAvailability = {
  id: 'avail-1',
  therapistId: 'T1',
  dayOfWeek: 1, // Monday
  startTime: '07:00',
  endTime: '15:00',
}

const baseParams = {
  therapistId: 'T1',
  patientId: 'P1',
  date: MON,
  startTime: '09:00',
  endTime: '10:00',
}

const makeSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 'sched-99',
  therapistId: 'T2',
  patientId: 'P2',
  procedureRoomId: null,
  startTime: '10:30',
  endTime: '11:30',
  status: 'planned',
  deletedAt: null,
  therapist: { id: 'T2', firstName: 'Jana', lastName: 'Nováková' },
  patient: { id: 'P2', firstName: 'Karel', lastName: 'Malý' },
  procedure: { id: 'proc-5', name: 'Masáž' },
  procedureRoom: null,
  ...overrides,
})

beforeEach(() => {
  mockFindMany.mockResolvedValue([])
  mockAvailability.mockResolvedValue(defaultAvailability as never)
  mockTimeOff.mockResolvedValue([])
})

describe('findConflicts', () => {
  it('returns empty array when no schedules exist', async () => {
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
  })

  it('returns empty array when existing schedule does not overlap', async () => {
    // 10:30–11:30 does not overlap with 09:00–10:00
    mockFindMany.mockResolvedValue([makeSchedule()] as never)
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
  })

  it('detects therapist conflict for overlapping schedule', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 'T1', startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist')
    expect(result[0].message).toContain('Nováková')
  })

  it('detects patient conflict for overlapping schedule', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({ patientId: 'P1', startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('patient')
    expect(result[0].message).toContain('Malý')
  })

  it('detects both conflicts when row matches both therapistId and patientId', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 'T1', patientId: 'P1', startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(2)
    const types = result.map((r) => r.type)
    expect(types).toContain('therapist')
    expect(types).toContain('patient')
  })

  it('ignores schedule with excludeScheduleId', async () => {
    mockFindMany.mockResolvedValue([])
    const result = await findConflicts({ ...baseParams, excludeScheduleId: 'sched-99' })
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 'sched-99' } }),
      })
    )
  })

  it('does not conflict on adjacent (touching) intervals', async () => {
    // 08:00–09:00 ends exactly when 09:00–10:00 starts → no overlap
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 'T1', startTime: '08:00', endTime: '09:00' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
  })

  it('conflicts on minimum overlap (one minute)', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 'T1', startTime: '09:59', endTime: '10:59' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist')
  })

  it('ignores cancelled schedules (DB filter handles it)', async () => {
    mockFindMany.mockResolvedValue([])
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'cancelled' } }),
      })
    )
  })

  it('returns therapist_unavailable when no availability for day', async () => {
    mockAvailability.mockResolvedValue(null as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist_unavailable')
    expect(result[0].message).toContain('není v tento den')
  })

  it('returns therapist_unavailable when procedure is outside working hours', async () => {
    // Availability 07:00-09:30 but we request 09:00-10:00 → endTime 10:00 > 09:30
    mockAvailability.mockResolvedValue({
      ...defaultAvailability,
      startTime: '07:00',
      endTime: '09:30',
    } as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist_unavailable')
    expect(result[0].message).toContain('07:00–09:30')
  })

  it('returns therapist_time_off when therapist has time off', async () => {
    mockTimeOff.mockResolvedValue([
      { id: 'to-1', therapistId: 'T1', startsAt: MON, endsAt: MON, reason: 'Dovolená' },
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist_time_off')
    expect(result[0].message).toContain('Dovolená')
  })

  it('detects room conflict', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({
        procedureRoomId: 'room-1',
        startTime: '09:15',
        endTime: '10:15',
        procedureRoom: { id: 'room-1', number: 'M1' },
      }),
    ] as never)
    const result = await findConflicts({ ...baseParams, procedureRoomId: 'room-1' })
    expect(result.some((r) => r.type === 'room')).toBe(true)
    expect(result.find((r) => r.type === 'room')?.message).toContain('M1')
  })
})
