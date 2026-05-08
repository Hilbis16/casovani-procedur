"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findConflicts } from "@/lib/conflictDetection";
import { addMinutes, formatDateParam } from "@/lib/dateUtils";

const ScheduleSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  procedureId: z.coerce.number().int().positive(),
  therapistId: z.coerce.number().int().positive(),
  date: z.string().min(1, "Datum je povinné"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Neplatný čas"),
  durationMin: z.coerce.number().int().positive(),
  note: z.string().optional(),
});

function revalidateAll() {
  revalidatePath("/planovani");
  revalidatePath("/pacienti");
  revalidatePath("/terapeuti");
}

export async function getWeekSchedules(weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return prisma.procedureSchedule.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getPatientWeekSchedules(patientId: number, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return prisma.procedureSchedule.findMany({
    where: { patientId, date: { gte: weekStart, lte: weekEnd } },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function getTherapistWeekSchedules(therapistId: number, weekStart: Date) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return prisma.procedureSchedule.findMany({
    where: { therapistId, date: { gte: weekStart, lte: weekEnd } },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

export async function createSchedule(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = ScheduleSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { patientId, procedureId, therapistId, date, startTime, durationMin, note } = parsed.data;
  const endTime = addMinutes(startTime, durationMin);
  const dateObj = new Date(date);
  dateObj.setUTCHours(0, 0, 0, 0);

  const conflicts = await findConflicts({ therapistId, patientId, date: dateObj, startTime, endTime });
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: conflicts[0].message };
  }

  await prisma.procedureSchedule.create({
    data: { patientId, procedureId, therapistId, date: dateObj, startTime, endTime, note: note || null },
  });
  revalidateAll();
  return { success: true };
}

export async function updateSchedule(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = ScheduleSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { patientId, procedureId, therapistId, date, startTime, durationMin, note } = parsed.data;
  const endTime = addMinutes(startTime, durationMin);
  const dateObj = new Date(date);
  dateObj.setUTCHours(0, 0, 0, 0);

  const conflicts = await findConflicts({
    therapistId,
    patientId,
    date: dateObj,
    startTime,
    endTime,
    excludeScheduleId: id,
  });
  if (conflicts.length > 0) {
    return { success: false, conflicts, error: conflicts[0].message };
  }

  await prisma.procedureSchedule.update({
    where: { id },
    data: { patientId, procedureId, therapistId, date: dateObj, startTime, endTime, note: note || null },
  });
  revalidateAll();
  return { success: true };
}

export async function updateScheduleStatus(id: number, status: string) {
  await prisma.procedureSchedule.update({ where: { id }, data: { status } });
  revalidateAll();
  return { success: true };
}

export async function deleteSchedule(id: number) {
  await prisma.procedureSchedule.delete({ where: { id } });
  revalidateAll();
  return { success: true };
}

export async function getPatientStaySchedules(patientId: number, from: Date, to: Date) {
  const dayStart = new Date(from);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(to);
  dayEnd.setUTCHours(23, 59, 59, 999);

  return prisma.procedureSchedule.findMany({
    where: { patientId, date: { gte: dayStart, lte: dayEnd } },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}

const RecurringSchema = z.object({
  patientId: z.number().int().positive(),
  procedureId: z.number().int().positive(),
  therapistId: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  note: z.string().optional(),
});

export async function checkRecurringConflicts(data: {
  patientId: number;
  therapistId: number;
  procedureId: number;
  startTime: string;
  daysOfWeek: number[];
  from: string;
  to: string;
}): Promise<{ date: string; hasConflict: boolean; conflictMessage?: string }[]> {
  const procedure = await prisma.procedure.findUnique({ where: { id: data.procedureId } });
  if (!procedure) return [];

  const endTime = addMinutes(data.startTime, procedure.durationMin);
  const results: { date: string; hasConflict: boolean; conflictMessage?: string }[] = [];

  const cur = new Date(data.from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(data.to);
  end.setUTCHours(0, 0, 0, 0);

  while (cur <= end) {
    if (data.daysOfWeek.includes(cur.getUTCDay())) {
      const conflicts = await findConflicts({
        patientId: data.patientId,
        therapistId: data.therapistId,
        date: new Date(cur),
        startTime: data.startTime,
        endTime,
      });
      results.push({
        date: formatDateParam(new Date(cur)),
        hasConflict: conflicts.length > 0,
        conflictMessage: conflicts[0]?.message,
      });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return results;
}

export async function createRecurringSchedules(data: {
  patientId: number;
  procedureId: number;
  therapistId: number;
  startTime: string;
  daysOfWeek: number[];
  from: string;
  to: string;
  note?: string;
}): Promise<{ success: boolean; created: number; skipped: number; error?: string }> {
  const parsed = RecurringSchema.safeParse(data);
  if (!parsed.success) return { success: false, created: 0, skipped: 0, error: parsed.error.issues[0].message };

  const { patientId, procedureId, therapistId, startTime, daysOfWeek, from, to, note } = parsed.data;

  const procedure = await prisma.procedure.findUnique({ where: { id: procedureId } });
  if (!procedure) return { success: false, created: 0, skipped: 0, error: "Procedura nenalezena" };

  const endTime = addMinutes(startTime, procedure.durationMin);

  const toCreate: {
    patientId: number;
    procedureId: number;
    therapistId: number;
    date: Date;
    startTime: string;
    endTime: string;
    note: string | null;
  }[] = [];
  let skipped = 0;

  const cur = new Date(from);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cur <= end) {
    if (daysOfWeek.includes(cur.getUTCDay())) {
      const conflicts = await findConflicts({ patientId, therapistId, date: new Date(cur), startTime, endTime });
      if (conflicts.length > 0) {
        skipped++;
      } else {
        toCreate.push({
          patientId,
          procedureId,
          therapistId,
          date: new Date(cur),
          startTime,
          endTime,
          note: note || null,
        });
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (toCreate.length > 0) {
    await prisma.procedureSchedule.createMany({ data: toCreate });
  }

  revalidateAll();
  revalidatePath(`/pacienti/${patientId}/pobyt`);
  return { success: true, created: toCreate.length, skipped };
}

export async function getDaySchedules(date: Date) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);

  return prisma.procedureSchedule.findMany({
    where: { date: { gte: dayStart, lte: dayEnd }, status: { not: "cancelled" } },
    include: { patient: true, procedure: true, therapist: true },
    orderBy: [{ therapistId: "asc" }, { startTime: "asc" }],
  });
}
