"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { findConflicts } from "@/lib/conflictDetection";
import { addMinutes } from "@/lib/dateUtils";

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
