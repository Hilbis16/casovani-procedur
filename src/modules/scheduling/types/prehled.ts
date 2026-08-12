import type {
  Therapist,
  TherapistAvailability,
  ProcedureSchedule,
  Patient,
  Procedure,
} from '@prisma/client'

export type TherapistWithAvailabilities = Therapist & { availabilities: TherapistAvailability[] }
export type FullSchedule = ProcedureSchedule & {
  patient: Patient
  procedure: Procedure
  therapist: Therapist
}

export interface TherapistBlock {
  therapist: TherapistWithAvailabilities
  schedules: FullSchedule[]
  scheduledMinutes: number
  availableMinutes: number
  occupancyPct: number | null
}

export interface DayStatsData {
  totalProcedures: number
  uniquePatients: number
  activeTherapists: number
  avgOccupancyPct: number | null
  categoryBreakdown: { key: string; label: string; count: number }[]
}
