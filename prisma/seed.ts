import { PrismaClient } from '@prisma/client'
import { addDays, startOfWeek } from 'date-fns'
import { hash } from '@node-rs/argon2'

const prisma = new PrismaClient()

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  lekar: [
    'patient.read',
    'patient.write',
    'schedule.read',
    'schedule.write',
    'schedule.delete',
    'schedule.status',
    'procedure.read',
    'procedure.write',
    'therapist.read',
    'prescription.read',
    'prescription.write',
  ],
  terapeut: [
    'patient.read',
    'schedule.read',
    'schedule.write',
    'schedule.status',
    'procedure.read',
    'therapist.read',
  ],
  recepcni: [
    'patient.read',
    'patient.write',
    'schedule.read',
    'schedule.write',
    'procedure.read',
    'therapist.read',
    'prescription.read',
    'prescription.write',
  ],
  auditor: ['audit.read', 'prescription.read'],
}

const ROLE_NAMES: Record<string, string> = {
  admin: 'Správce',
  lekar: 'Lékař',
  terapeut: 'Terapeut',
  recepcni: 'Recepční',
  auditor: 'Auditor',
}

function weekDate(offsetDays: number): Date {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const d = addDays(monday, offsetDays)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

async function seedUsers() {
  const roleMap: Record<string, string> = {}
  for (const [key, actions] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { name: ROLE_NAMES[key] ?? key },
      create: { key, name: ROLE_NAMES[key] ?? key },
    })
    roleMap[key] = role.id
    await prisma.permission.deleteMany({ where: { roleId: role.id } })
    await prisma.permission.createMany({
      data: actions.map((action) => ({ roleId: role.id, action })),
    })
  }

  const operatorEmail = process.env.SEED_OPERATOR_EMAIL ?? 'operator@system.local'
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD ?? 'ChangeMe123!'
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@facility.local'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe456!'

  const operatorHash = await hash(operatorPassword)
  const adminHash = await hash(adminPassword)

  const operator = await prisma.user.upsert({
    where: { email: operatorEmail },
    update: {},
    create: { email: operatorEmail, passwordHash: operatorHash, fullName: 'Recepční Demo' },
  })
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, passwordHash: adminHash, fullName: 'Správce Zařízení' },
  })

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: operator.id, roleId: roleMap.recepcni } },
    update: {},
    create: { userId: operator.id, roleId: roleMap.recepcni },
  })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roleMap.admin } },
    update: {},
    create: { userId: admin.id, roleId: roleMap.admin },
  })

  console.log(`Role: ${Object.keys(ROLE_PERMISSIONS).join(', ')}`)
  console.log(`Uživatelé: ${operatorEmail} (recepční), ${adminEmail} (správce)`)
}

async function seedPrescriptionTemplates(procedureByName: Record<string, string>) {
  const templates: {
    name: string
    description: string
    items: { name: string; repetitions: number; preferredTime: string; sortOrder: number }[]
  }[] = [
    {
      name: 'Rehabilitace zad',
      description:
        'Standardní protokol pro pacienty s bolestmi zad — masáž, reflexní terapie, magnetoterapie.',
      items: [
        { name: 'Klasická masáž', repetitions: 5, preferredTime: '09:00', sortOrder: 0 },
        { name: 'Reflexní masáž', repetitions: 3, preferredTime: '10:30', sortOrder: 1 },
        { name: 'Magnetoterapie', repetitions: 3, preferredTime: '13:00', sortOrder: 2 },
      ],
    },
    {
      name: 'Wellness týden',
      description: 'Relaxační balíček — perličková koupel, klasická masáž, vodoléčba.',
      items: [
        { name: 'Perličková koupel', repetitions: 3, preferredTime: '09:30', sortOrder: 0 },
        { name: 'Klasická masáž', repetitions: 2, preferredTime: '11:00', sortOrder: 1 },
        { name: 'Vodoléčba', repetitions: 2, preferredTime: '14:00', sortOrder: 2 },
      ],
    },
    {
      name: 'Pohybový aparát',
      description: 'Intenzivní protokol pro obnovu pohybového aparátu.',
      items: [
        { name: 'Elektroléčba', repetitions: 5, preferredTime: '09:00', sortOrder: 0 },
        { name: 'Magnetoterapie', repetitions: 3, preferredTime: '10:00', sortOrder: 1 },
        { name: 'Vodoléčba', repetitions: 2, preferredTime: '13:30', sortOrder: 2 },
      ],
    },
  ]

  for (const tpl of templates) {
    const template = await prisma.prescriptionTemplate.upsert({
      where: { name: tpl.name },
      update: { description: tpl.description, isActive: true },
      create: { name: tpl.name, description: tpl.description, isActive: true },
    })
    await prisma.prescriptionTemplateItem.deleteMany({ where: { templateId: template.id } })
    await prisma.prescriptionTemplateItem.createMany({
      data: tpl.items
        .filter((i) => procedureByName[i.name])
        .map((i) => ({
          templateId: template.id,
          procedureId: procedureByName[i.name],
          repetitions: i.repetitions,
          preferredTime: i.preferredTime,
          sortOrder: i.sortOrder,
        })),
    })
  }
  console.log(`Šablony předpisů: ${templates.map((t) => t.name).join(', ')}`)
}

async function main() {
  await seedUsers()

  await prisma.procedureSchedule.deleteMany()
  await prisma.prescriptionItem.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.prescriptionTemplateItem.deleteMany()
  await prisma.prescriptionTemplate.deleteMany()
  await prisma.stay.deleteMany()
  await prisma.therapistAvailability.deleteMany()
  await prisma.therapistTimeOff.deleteMany()
  await prisma.therapist.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.procedure.deleteMany()
  await prisma.room.deleteMany()
  await prisma.building.deleteMany()

  // Buildings & rooms
  const buildingA = await prisma.building.create({
    data: { code: 'A', name: 'Budova A — léčebná' },
  })
  const buildingB = await prisma.building.create({
    data: { code: 'B', name: 'Budova B — balneologická' },
  })

  const rooms = await Promise.all([
    // patient rooms
    prisma.room.create({
      data: { buildingId: buildingA.id, number: '4', floor: 1, kind: 'patient_room' },
    }),
    prisma.room.create({
      data: { buildingId: buildingA.id, number: '7', floor: 1, kind: 'patient_room' },
    }),
    prisma.room.create({
      data: { buildingId: buildingA.id, number: '12', floor: 2, kind: 'patient_room' },
    }),
    prisma.room.create({
      data: { buildingId: buildingB.id, number: '23', floor: 1, kind: 'patient_room' },
    }),
    // procedure rooms — Budova A
    prisma.room.create({
      data: {
        buildingId: buildingA.id,
        number: 'M1',
        floor: 0,
        kind: 'procedure_room',
        capacity: 2,
      },
    }),
    prisma.room.create({
      data: {
        buildingId: buildingA.id,
        number: 'E1',
        floor: 0,
        kind: 'procedure_room',
        capacity: 3,
      },
    }),
    // procedure rooms — Budova B
    prisma.room.create({
      data: {
        buildingId: buildingB.id,
        number: 'M2',
        floor: 0,
        kind: 'procedure_room',
        capacity: 1,
      },
    }),
    prisma.room.create({
      data: {
        buildingId: buildingB.id,
        number: 'H1',
        floor: 0,
        kind: 'procedure_room',
        capacity: 1,
      },
    }),
    prisma.room.create({
      data: {
        buildingId: buildingB.id,
        number: 'H2',
        floor: 0,
        kind: 'procedure_room',
        capacity: 1,
      },
    }),
  ])
  // rooms[0]=A/4, [1]=A/7, [2]=A/12, [3]=B/23 (patient)
  // rooms[4]=A/M1(masáž,cap2), [5]=A/E1(elektro/magneto,cap3)
  // rooms[6]=B/M2(masáž private,cap1), [7]=B/H1(hydro,cap1), [8]=B/H2(hydro,cap1)

  // Therapists
  const therapists = await Promise.all([
    prisma.therapist.create({
      data: {
        firstName: 'Jan',
        lastName: 'Novák',
        phone: '602 111 222',
        color: '#3B82F6',
        availabilities: {
          create: [1, 2, 3, 4, 5].map((d) => ({
            dayOfWeek: d,
            startTime: '07:00',
            endTime: '15:00',
          })),
        },
      },
    }),
    prisma.therapist.create({
      data: {
        firstName: 'Eva',
        lastName: 'Kratochvílová',
        phone: '603 333 444',
        color: '#10B981',
        availabilities: {
          create: [1, 2, 3, 4, 5].map((d) => ({
            dayOfWeek: d,
            startTime: '08:00',
            endTime: '16:00',
          })),
        },
      },
    }),
    prisma.therapist.create({
      data: {
        firstName: 'Petra',
        lastName: 'Svobodová',
        phone: '604 555 666',
        color: '#F59E0B',
        availabilities: {
          create: [1, 2, 3, 4, 5, 6].map((d) => ({
            dayOfWeek: d,
            startTime: '07:30',
            endTime: '15:30',
          })),
        },
      },
    }),
  ])

  // Patients (no stay fields)
  const patients = await Promise.all([
    prisma.patient.create({
      data: { firstName: 'František', lastName: 'Novák', note: 'Alergie na latex' },
    }),
    prisma.patient.create({ data: { firstName: 'Jana', lastName: 'Svobodová' } }),
    prisma.patient.create({ data: { firstName: 'Tomáš', lastName: 'Kratochvíl' } }),
    prisma.patient.create({ data: { firstName: 'Marie', lastName: 'Bílá' } }),
  ])

  // Stays — one per patient
  const stays = await Promise.all([
    prisma.stay.create({
      data: {
        code: '2026-0001',
        patientId: patients[0].id,
        roomId: rooms[2].id, // A/12
        arrivalDate: weekDate(-7),
        departureDate: weekDate(7),
        status: 'checked_in',
      },
    }),
    prisma.stay.create({
      data: {
        code: '2026-0002',
        patientId: patients[1].id,
        roomId: rooms[1].id, // A/7
        arrivalDate: weekDate(-3),
        departureDate: weekDate(11),
        status: 'checked_in',
      },
    }),
    prisma.stay.create({
      data: {
        code: '2026-0003',
        patientId: patients[2].id,
        roomId: rooms[3].id, // B/23
        arrivalDate: weekDate(-5),
        departureDate: weekDate(9),
        status: 'checked_in',
      },
    }),
    prisma.stay.create({
      data: {
        code: '2026-0004',
        patientId: patients[3].id,
        roomId: rooms[0].id, // A/4
        arrivalDate: weekDate(0),
        departureDate: weekDate(14),
        status: 'planned',
      },
    }),
  ])

  // Procedures (with building + room text for print/display)
  const procedures = await Promise.all([
    // [0] masáž
    prisma.procedure.create({
      data: {
        name: 'Klasická masáž',
        category: 'masaz',
        durationMin: 60,
        capacity: 1,
        building: 'Budova A',
        room: 'M1',
      },
    }),
    // [1] hydroterapie
    prisma.procedure.create({
      data: {
        name: 'Perličková koupel',
        category: 'hydroterapie',
        durationMin: 20,
        capacity: 1,
        building: 'Budova B',
        room: 'H1',
      },
    }),
    // [2] elektroterapie
    prisma.procedure.create({
      data: {
        name: 'Elektroléčba',
        category: 'elektroterapie',
        durationMin: 30,
        capacity: 3,
        building: 'Budova A',
        room: 'E1',
      },
    }),
    // [3] magnetoterapie
    prisma.procedure.create({
      data: {
        name: 'Magnetoterapie',
        category: 'magnetoterapie',
        durationMin: 20,
        capacity: 3,
        building: 'Budova A',
        room: 'E1',
      },
    }),
    // [4] masáž
    prisma.procedure.create({
      data: {
        name: 'Reflexní masáž',
        category: 'masaz',
        durationMin: 45,
        capacity: 1,
        building: 'Budova A',
        room: 'M1',
      },
    }),
    // [5] hydroterapie
    prisma.procedure.create({
      data: {
        name: 'Vodoléčba',
        category: 'hydroterapie',
        durationMin: 30,
        capacity: 1,
        building: 'Budova B',
        room: 'H2',
      },
    }),
    // [6] masáž — Budova B soukromý kabinet
    prisma.procedure.create({
      data: {
        name: 'Sportovní masáž',
        category: 'masaz',
        durationMin: 45,
        capacity: 1,
        building: 'Budova B',
        room: 'M2',
      },
    }),
    // [7] jiné
    prisma.procedure.create({
      data: {
        name: 'Rašelinový zábal',
        category: 'jine',
        durationMin: 30,
        capacity: 1,
        building: 'Budova B',
        room: 'H2',
      },
    }),
  ])

  // Schedules — rooms matched to procedure type
  // rIdx: 4=A/M1(masáž), 5=A/E1(elektro/magneto), 6=B/M2(masáž private), 7=B/H1(hydro), 8=B/H2(hydro)
  const scheduleData = [
    { pIdx: 0, sIdx: 0, procIdx: 0, tIdx: 0, rIdx: 4, dayOffset: 0, start: '08:00', end: '09:00' }, // masáž → A/M1
    { pIdx: 0, sIdx: 0, procIdx: 3, tIdx: 1, rIdx: 5, dayOffset: 1, start: '09:00', end: '09:20' }, // magneto → A/E1
    { pIdx: 0, sIdx: 0, procIdx: 2, tIdx: 2, rIdx: 5, dayOffset: 2, start: '10:00', end: '10:30' }, // elektro → A/E1
    { pIdx: 0, sIdx: 0, procIdx: 0, tIdx: 0, rIdx: 4, dayOffset: 3, start: '08:00', end: '09:00' }, // masáž → A/M1
    { pIdx: 0, sIdx: 0, procIdx: 7, tIdx: 2, rIdx: 8, dayOffset: 4, start: '11:00', end: '11:30' }, // zábal → B/H2
    { pIdx: 1, sIdx: 1, procIdx: 1, tIdx: 1, rIdx: 7, dayOffset: 0, start: '09:30', end: '09:50' }, // hydro → B/H1
    { pIdx: 1, sIdx: 1, procIdx: 4, tIdx: 2, rIdx: 4, dayOffset: 1, start: '11:00', end: '11:45' }, // refl.masáž → A/M1
    { pIdx: 1, sIdx: 1, procIdx: 3, tIdx: 0, rIdx: 5, dayOffset: 3, start: '10:00', end: '10:20' }, // magneto → A/E1
    { pIdx: 1, sIdx: 1, procIdx: 5, tIdx: 1, rIdx: 8, dayOffset: 4, start: '13:00', end: '13:30' }, // vodoléčba → B/H2
    { pIdx: 2, sIdx: 2, procIdx: 2, tIdx: 2, rIdx: 5, dayOffset: 0, start: '11:00', end: '11:30' }, // elektro → A/E1
    { pIdx: 2, sIdx: 2, procIdx: 0, tIdx: 1, rIdx: 4, dayOffset: 2, start: '08:00', end: '09:00' }, // masáž → A/M1
    { pIdx: 2, sIdx: 2, procIdx: 6, tIdx: 0, rIdx: 6, dayOffset: 3, start: '09:30', end: '10:15' }, // sport.masáž → B/M2
    { pIdx: 3, sIdx: 3, procIdx: 5, tIdx: 0, rIdx: 8, dayOffset: 1, start: '14:00', end: '14:30' }, // vodoléčba → B/H2
    { pIdx: 3, sIdx: 3, procIdx: 3, tIdx: 2, rIdx: 5, dayOffset: 4, start: '09:00', end: '09:20' }, // magneto → A/E1
    { pIdx: 3, sIdx: 3, procIdx: 4, tIdx: 1, rIdx: 4, dayOffset: 2, start: '10:00', end: '10:45' }, // refl.masáž → A/M1
  ]

  for (const s of scheduleData) {
    await prisma.procedureSchedule.create({
      data: {
        stayId: stays[s.sIdx].id,
        patientId: patients[s.pIdx].id,
        procedureId: procedures[s.procIdx].id,
        therapistId: therapists[s.tIdx].id,
        procedureRoomId: rooms[s.rIdx].id,
        date: weekDate(s.dayOffset),
        startTime: s.start,
        endTime: s.end,
      },
    })
  }

  const procedureByName: Record<string, string> = {}
  for (const p of procedures) procedureByName[p.name] = p.id
  await seedPrescriptionTemplates(procedureByName)

  console.log('Seed hotov.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
