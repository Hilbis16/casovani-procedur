import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before importing conflictDetection
vi.mock('./prisma', () => ({
  prisma: {
    procedureSchedule: {
      findMany: vi.fn(),
    },
  },
}))

import { findConflicts } from './conflictDetection'
import { prisma } from './prisma'

const mockFindMany = vi.mocked(prisma.procedureSchedule.findMany)

const baseParams = {
  therapistId: 1,
  patientId: 10,
  date: new Date('2026-05-08'),
  startTime: '09:00',
  endTime: '10:00',
}

const makeSchedule = (overrides: Record<string, unknown> = {}) => ({
  id: 99,
  therapistId: 2,
  patientId: 20,
  startTime: '10:30',
  endTime: '11:30',
  status: 'planned',
  therapist: { id: 2, firstName: 'Jana', lastName: 'Nováková' },
  patient: { id: 20, firstName: 'Karel', lastName: 'Malý' },
  procedure: { id: 5, name: 'Masáž' },
  ...overrides,
})

beforeEach(() => {
  mockFindMany.mockResolvedValue([])
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
    // 09:30–10:30 overlaps with 09:00–10:00
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 1, startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist')
    expect(result[0].message).toContain('Nováková')
  })

  it('detects patient conflict for overlapping schedule', async () => {
    mockFindMany.mockResolvedValue([
      makeSchedule({ patientId: 10, startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('patient')
    expect(result[0].message).toContain('Malý')
  })

  it('detects both conflicts when same person is both therapist and patient in DB row', async () => {
    // Unusual edge case: row matches both therapistId and patientId
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 1, patientId: 10, startTime: '09:30', endTime: '10:30' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(2)
    const types = result.map((r) => r.type)
    expect(types).toContain('therapist')
    expect(types).toContain('patient')
  })

  it('ignores schedule with excludeScheduleId', async () => {
    // Prisma filters by id already — simulate by returning empty from mock
    mockFindMany.mockResolvedValue([])
    const result = await findConflicts({ ...baseParams, excludeScheduleId: 99 })
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 99 } }),
      })
    )
  })

  it('does not conflict on adjacent (touching) intervals', async () => {
    // 08:00–09:00 ends exactly when 09:00–10:00 starts → no overlap
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 1, startTime: '08:00', endTime: '09:00' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
  })

  it('conflicts on minimum overlap (one minute)', async () => {
    // 09:59–10:59 overlaps with 09:00–10:00 by 1 minute
    mockFindMany.mockResolvedValue([
      makeSchedule({ therapistId: 1, startTime: '09:59', endTime: '10:59' }),
    ] as never)
    const result = await findConflicts(baseParams)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('therapist')
  })

  it('ignores cancelled schedules (DB filter handles it)', async () => {
    // The DB query filters out cancelled — simulate by returning empty
    mockFindMany.mockResolvedValue([])
    const result = await findConflicts(baseParams)
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: 'cancelled' } }),
      })
    )
  })
})
