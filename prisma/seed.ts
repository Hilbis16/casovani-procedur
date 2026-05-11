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
  ],
  auditor: ['audit.read'],
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

async function main() {
  await seedUsers()

  await prisma.procedureSchedule.deleteMany()
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
    data: { code: 'A', name: 'Budova A' },
  })
  const buildingB = await prisma.building.create({
    data: { code: 'B', name: 'Budova B' },
  })

  const rooms = await Promise.all([
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
    prisma.room.create({
      data: {
        buildingId: buildingB.id,
        number: 'M1',
        floor: 0,
        kind: 'procedure_room',
        capacity: 2,
      },
    }),
    prisma.room.create({
      data: {
        buildingId: buildingB.id,
        number: 'M2',
        floor: 0,
        kind: 'procedure_room',
        capacity: 1,
      },
    }),
  ])
  // rooms[0]=A/4, [1]=A/7, [2]=A/12, [3]=B/23, [4]=B/M1(proc), [5]=B/M2(proc)

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

  // Procedures
  const procedures = await Promise.all([
    prisma.procedure.create({
      data: { name: 'Klasická masáž', category: 'masaz', durationMin: 60 },
    }),
    prisma.procedure.create({
      data: { name: 'Perličková koupel', category: 'hydroterapie', durationMin: 20 },
    }),
    prisma.procedure.create({
      data: { name: 'Elektroléčba', category: 'elektroterapie', durationMin: 30 },
    }),
    prisma.procedure.create({
      data: { name: 'Magnetoterapie', category: 'magnetoterapie', durationMin: 20 },
    }),
    prisma.procedure.create({
      data: { name: 'Reflexní masáž', category: 'masaz', durationMin: 45 },
    }),
    prisma.procedure.create({
      data: { name: 'Vodoléčba', category: 'hydroterapie', durationMin: 30 },
    }),
  ])

  // Schedules — now require stayId
  const scheduleData = [
    { pIdx: 0, sIdx: 0, procIdx: 0, tIdx: 0, rIdx: 4, dayOffset: 0, start: '08:00', end: '09:00' },
    { pIdx: 0, sIdx: 0, procIdx: 3, tIdx: 1, rIdx: 5, dayOffset: 1, start: '09:00', end: '09:20' },
    { pIdx: 0, sIdx: 0, procIdx: 2, tIdx: 2, rIdx: 4, dayOffset: 2, start: '10:00', end: '10:30' },
    { pIdx: 0, sIdx: 0, procIdx: 0, tIdx: 0, rIdx: 4, dayOffset: 3, start: '08:00', end: '09:00' },
    { pIdx: 1, sIdx: 1, procIdx: 1, tIdx: 1, rIdx: 5, dayOffset: 0, start: '09:30', end: '09:50' },
    { pIdx: 1, sIdx: 1, procIdx: 4, tIdx: 2, rIdx: 4, dayOffset: 1, start: '11:00', end: '11:45' },
    { pIdx: 1, sIdx: 1, procIdx: 3, tIdx: 0, rIdx: 5, dayOffset: 3, start: '10:00', end: '10:20' },
    { pIdx: 2, sIdx: 2, procIdx: 2, tIdx: 2, rIdx: 4, dayOffset: 0, start: '11:00', end: '11:30' },
    { pIdx: 2, sIdx: 2, procIdx: 0, tIdx: 1, rIdx: 5, dayOffset: 2, start: '08:00', end: '09:00' },
    { pIdx: 3, sIdx: 3, procIdx: 5, tIdx: 0, rIdx: 4, dayOffset: 1, start: '14:00', end: '14:30' },
    { pIdx: 3, sIdx: 3, procIdx: 3, tIdx: 2, rIdx: 5, dayOffset: 4, start: '09:00', end: '09:20' },
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

  console.log('Seed hotov.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
