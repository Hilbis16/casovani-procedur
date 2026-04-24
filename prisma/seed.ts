import { PrismaClient } from "@prisma/client";
import { addDays, startOfWeek, format } from "date-fns";

const prisma = new PrismaClient();

function weekDate(offsetDays: number): Date {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const d = addDays(monday, offsetDays);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  await prisma.procedureSchedule.deleteMany();
  await prisma.therapistAvailability.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.procedure.deleteMany();

  const therapists = await Promise.all([
    prisma.therapist.create({
      data: {
        firstName: "Jan",
        lastName: "Novák",
        phone: "602 111 222",
        color: "#3B82F6",
        availabilities: {
          create: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: "07:00", endTime: "15:00" })),
        },
      },
    }),
    prisma.therapist.create({
      data: {
        firstName: "Eva",
        lastName: "Kratochvílová",
        phone: "603 333 444",
        color: "#10B981",
        availabilities: {
          create: [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: "08:00", endTime: "16:00" })),
        },
      },
    }),
    prisma.therapist.create({
      data: {
        firstName: "Petra",
        lastName: "Svobodová",
        phone: "604 555 666",
        color: "#F59E0B",
        availabilities: {
          create: [1, 2, 3, 4, 5, 6].map((d) => ({ dayOfWeek: d, startTime: "07:30", endTime: "15:30" })),
        },
      },
    }),
  ]);

  const patients = await Promise.all([
    prisma.patient.create({
      data: {
        firstName: "František",
        lastName: "Novák",
        roomNumber: "12",
        arrivalDate: weekDate(-7),
        departureDate: weekDate(7),
        note: "Alergie na latex",
      },
    }),
    prisma.patient.create({
      data: {
        firstName: "Jana",
        lastName: "Svobodová",
        roomNumber: "7",
        arrivalDate: weekDate(-3),
        departureDate: weekDate(11),
      },
    }),
    prisma.patient.create({
      data: {
        firstName: "Tomáš",
        lastName: "Kratochvíl",
        roomNumber: "23",
        arrivalDate: weekDate(-5),
        departureDate: weekDate(9),
      },
    }),
    prisma.patient.create({
      data: {
        firstName: "Marie",
        lastName: "Bílá",
        roomNumber: "4",
        arrivalDate: weekDate(0),
        departureDate: weekDate(14),
      },
    }),
  ]);

  const procedures = await Promise.all([
    prisma.procedure.create({ data: { name: "Klasická masáž", category: "masaz", durationMin: 60 } }),
    prisma.procedure.create({ data: { name: "Perličková koupel", category: "hydroterapie", durationMin: 20 } }),
    prisma.procedure.create({ data: { name: "Elektroléčba", category: "elektroterapie", durationMin: 30 } }),
    prisma.procedure.create({ data: { name: "Magnetoterapie", category: "magnetoterapie", durationMin: 20 } }),
    prisma.procedure.create({ data: { name: "Reflexní masáž", category: "masaz", durationMin: 45 } }),
    prisma.procedure.create({ data: { name: "Vodoléčba", category: "hydroterapie", durationMin: 30 } }),
  ]);

  const schedules = [
    { patientIdx: 0, procedureIdx: 0, therapistIdx: 0, dayOffset: 0, start: "08:00", end: "09:00" },
    { patientIdx: 0, procedureIdx: 3, therapistIdx: 1, dayOffset: 1, start: "09:00", end: "09:20" },
    { patientIdx: 0, procedureIdx: 2, therapistIdx: 2, dayOffset: 2, start: "10:00", end: "10:30" },
    { patientIdx: 0, procedureIdx: 0, therapistIdx: 0, dayOffset: 3, start: "08:00", end: "09:00" },
    { patientIdx: 1, procedureIdx: 1, therapistIdx: 1, dayOffset: 0, start: "09:30", end: "09:50" },
    { patientIdx: 1, procedureIdx: 4, therapistIdx: 2, dayOffset: 1, start: "11:00", end: "11:45" },
    { patientIdx: 1, procedureIdx: 3, therapistIdx: 0, dayOffset: 3, start: "10:00", end: "10:20" },
    { patientIdx: 2, procedureIdx: 2, therapistIdx: 2, dayOffset: 0, start: "11:00", end: "11:30" },
    { patientIdx: 2, procedureIdx: 0, therapistIdx: 1, dayOffset: 2, start: "08:00", end: "09:00" },
    { patientIdx: 3, procedureIdx: 5, therapistIdx: 0, dayOffset: 1, start: "14:00", end: "14:30" },
    { patientIdx: 3, procedureIdx: 3, therapistIdx: 2, dayOffset: 4, start: "09:00", end: "09:20" },
  ];

  for (const s of schedules) {
    await prisma.procedureSchedule.create({
      data: {
        patientId: patients[s.patientIdx].id,
        procedureId: procedures[s.procedureIdx].id,
        therapistId: therapists[s.therapistIdx].id,
        date: weekDate(s.dayOffset),
        startTime: s.start,
        endTime: s.end,
      },
    });
  }

  console.log("Seed hotov.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
