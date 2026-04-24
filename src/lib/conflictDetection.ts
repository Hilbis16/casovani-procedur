import { prisma } from "./prisma";

export interface ConflictResult {
  type: "therapist" | "patient";
  message: string;
  scheduleId: number;
}

function intervalsOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

export async function findConflicts(params: {
  therapistId: number;
  patientId: number;
  date: Date;
  startTime: string;
  endTime: string;
  excludeScheduleId?: number;
}): Promise<ConflictResult[]> {
  const { therapistId, patientId, date, startTime, endTime, excludeScheduleId } = params;

  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const schedules = await prisma.procedureSchedule.findMany({
    where: {
      date: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      OR: [{ therapistId }, { patientId }],
    },
    include: {
      therapist: true,
      patient: true,
      procedure: true,
    },
  });

  const conflicts: ConflictResult[] = [];

  for (const s of schedules) {
    if (!intervalsOverlap(s.startTime, s.endTime, startTime, endTime)) continue;

    if (s.therapistId === therapistId) {
      conflicts.push({
        type: "therapist",
        message: `Terapeut ${s.therapist.lastName} má v tento čas jinou proceduru (${s.procedure.name}, ${s.startTime}–${s.endTime})`,
        scheduleId: s.id,
      });
    }
    if (s.patientId === patientId) {
      conflicts.push({
        type: "patient",
        message: `Pacient ${s.patient.lastName} má v tento čas jinou proceduru (${s.procedure.name}, ${s.startTime}–${s.endTime})`,
        scheduleId: s.id,
      });
    }
  }

  return conflicts;
}
