"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PatientSchema = z.object({
  firstName: z.string().min(1, "Jméno je povinné"),
  lastName: z.string().min(1, "Příjmení je povinné"),
  roomNumber: z.string().min(1, "Číslo pokoje je povinné"),
  arrivalDate: z.string().min(1, "Datum příjezdu je povinné"),
  departureDate: z.string().min(1, "Datum odjezdu je povinné"),
  note: z.string().optional(),
});

export async function getPatients(query?: string) {
  return prisma.patient.findMany({
    where: query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { roomNumber: { contains: query } },
          ],
        }
      : undefined,
    orderBy: { lastName: "asc" },
  });
}

export async function getPatient(id: number) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function createPatient(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = PatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { firstName, lastName, roomNumber, arrivalDate, departureDate, note } = parsed.data;
  await prisma.patient.create({
    data: {
      firstName,
      lastName,
      roomNumber,
      arrivalDate: new Date(arrivalDate),
      departureDate: new Date(departureDate),
      note: note || null,
    },
  });
  revalidatePath("/pacienti");
  return { success: true };
}

export async function updatePatient(id: number, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = PatientSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const { firstName, lastName, roomNumber, arrivalDate, departureDate, note } = parsed.data;
  await prisma.patient.update({
    where: { id },
    data: {
      firstName,
      lastName,
      roomNumber,
      arrivalDate: new Date(arrivalDate),
      departureDate: new Date(departureDate),
      note: note || null,
    },
  });
  revalidatePath("/pacienti");
  revalidatePath(`/pacienti/${id}`);
  return { success: true };
}

export async function deletePatient(id: number) {
  await prisma.patient.delete({ where: { id } });
  revalidatePath("/pacienti");
  return { success: true };
}
