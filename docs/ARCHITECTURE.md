# Architecture

## Overview

Modulární monolit — jeden Node.js proces, jedna PostgreSQL databáze, tvrdě vynucené hranice modulů přes ESLint `no-restricted-imports`. Aplikace podporuje **tři licenční tiery** (scheduling-only / hotel-only / full) přes ENV flag, **bez** code-base forku.

## Module structure

```
src/
  app/                    # Tenké Next.js route shells
  modules/
    core/                 # Sdílené jádro (auth, audit, RBAC, services, events, GDPR, Patient*)
    scheduling/           # Časování procedur (ambulantní modul)
    hotel/                # Ubytování (Phase 7+)
    reporting/            # Tisk, export, dashboardy
  components/ui/          # Design system (Radix + Tailwind)
  proxy.ts                # Auth gate, route guard pro vypnuté moduly (Next.js 16: dříve middleware.ts)
```

\* `Patient` žije v `core` jako sdílená entita — používá ji scheduling i hotel modul.

## Dependency rules

- Každý modul může importovat z `@/modules/core/*` a `@/components/ui/*`.
- Moduly nesmí importovat přímo z jiných modulů (`scheduling` ↔ `hotel` jen přes `core/contracts`).
- `src/app/` může importovat odkudkoli (composition root).
- Všechny mutace `Patient`, `Stay`, `Room`, `Building` jdou přes `core/services/*`.

Pravidla jsou vynucena ESLintem (`no-restricted-imports`): Phase 0–3 = warn, Phase 4+ = error.

## Inter-module communication

**Synchronní:** moduly volají `core/services/*` (typované service objekty).

**Asynchronní:** doménové eventy přes `core/events/bus`:

- Phase 1–8: in-memory synchronní bus
- Phase 9+: pg-boss outbox pattern

## Tech stack

| Vrstva        | Volba                                                 |
| ------------- | ----------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Turbopack)                    |
| UI            | React 19, Tailwind 4, Radix UI                        |
| ORM           | Prisma 6                                              |
| Databáze      | PostgreSQL 16                                         |
| Auth          | Auth.js v5 (JWT strategy, Credentials provider)       |
| Jobs          | pg-boss (Phase 9+)                                    |
| Encryption    | prisma-field-encryption + `@47ng/cloak` (AES-256-GCM) |
| Notifications | sonner v2.0.7 (toast, `<Toaster />` v root layoutu)   |
| Logging       | Pino                                                  |

## Data flow diagram

```
Browser → proxy.ts (auth gate + module-route guard) → Next.js App Router
         ↓
    Server Actions (entry point for RBAC + audit + module guard)
         ↓
    modules/core/services/* (business logic, transactions)
         ↓
    Prisma Client → PostgreSQL
         ↑
    modules/core/audit/* (append-only AuditLog)
```

Podrobnosti viz `docs/adr/` pro rozhodnutí a `docs/COMPLIANCE.md` pro GDPR mapování.

---

## Modular Tiers (Phase 8)

Jedna code-base, tři produktové balíčky. Volba se dělá při deployi přes ENV proměnnou — **žádný build-time switch, žádný feature flag service**.

### Tier matrix

| Tier               | `ENABLED_MODULES`    | Co umí                                     | Cílová klientela        |
| ------------------ | -------------------- | ------------------------------------------ | ----------------------- |
| **scheduling**     | `"scheduling"`       | Pacienti + plánování procedur (bez pobytů) | Ambulantní rehabilitace |
| **hotel**          | `"hotel"`            | Pacienti + pobyty + pokoje                 | Ubytovací zařízení      |
| **full** (default) | `"scheduling,hotel"` | Vše                                        | Lázně, klasický balíček |

Default při neuvedeném ENV: `"scheduling,hotel"` (backward compat s existujícími instalacemi).

### Implementační kontrakt

| Vrstva                | Co dělá při vypnutém modulu                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `core/features/`      | `isModuleEnabled('hotel')` vrací `false`                                |
| `proxy.ts`            | Routy modulu vrací **404** (`/ubytovani/*` při hotel off)               |
| `MainNav.tsx`         | Skryje navigaci položky modulu                                          |
| Server Actions modulu | Vrací `{ success: false, error: 'Module disabled' }` (defence in depth) |
| Formuláře             | Skryjí pole vyžadující vypnutý modul (např. select pobytu v plánování)  |
| `seed.ts`             | Vynechá role/permissions vypnutého modulu                               |

### Datový model — klíčová úprava

`ProcedureSchedule.stayId` je **nullable** (`String?`).

- **Full tier**: stayId povinný v UI, conflict detection ho používá.
- **Scheduling-only tier**: stayId vždy `null`, conflict detection ho ignoruje (kontroluje jen patient/therapist/room).

To umožňuje provoz scheduling bez existence jediné `Stay` entity v DB.

### Co se NEdělá v Phase 8

- **Per-Facility flag v DB** — odloženo, single-tenant per instance stačí. Pokud někdy bude multi-tenant SaaS, ENV flag se přesune do `Facility` modelu.
- **Build-time tree-shaking** — hotel kód zůstává v bundle i při scheduling-only; rozdíl je jen runtime. Zjednodušuje deploy (jeden Docker image pro všechny tiery).
- **Dynamický restart při změně flagu** — vyžaduje restart procesu.

---

## Datový model (Phase 3 — aktuální stav)

```
Building ──< Room ──< Stay >── Patient ──< ProcedureSchedule
                                              │
                         Therapist ───────────┤
                         Procedure ───────────┤
                         Room (procedureRoom) ─┘
```

V Phase 8: vazba `ProcedureSchedule.stayId` se mění z required na optional.

### Klíčové entity

| Model                   | Popis                                                                                     | ID   | Modul                                              |
| ----------------------- | ----------------------------------------------------------------------------------------- | ---- | -------------------------------------------------- |
| `Building`              | Budova (A, B, Centrum)                                                                    | cuid | hotel                                              |
| `Room`                  | Pokoj nebo procedurní místnost; `kind`: patient_room / procedure_room / office            | cuid | hotel (patient_room) / scheduling (procedure_room) |
| `Patient`               | Pacient (firstName, lastName, note, deletedAt)                                            | cuid | **core** (sdílená)                                 |
| `Stay`                  | Pobyt pacienta; `code`: `2026-XXXX`; `status`: planned/checked_in/checked_out/cancelled   | cuid | hotel                                              |
| `Therapist`             | Terapeut (jméno, barva, isActive)                                                         | cuid | scheduling                                         |
| `TherapistAvailability` | Pravidelná dostupnost (dayOfWeek 0–6, startTime, endTime)                                 | cuid | scheduling                                         |
| `TherapistTimeOff`      | Nepřítomnost (startsAt, endsAt, reason)                                                   | cuid | scheduling                                         |
| `Procedure`             | Procedura (name, category, durationMin, room)                                             | cuid | scheduling                                         |
| `ProcedureSchedule`     | Naplánovaná procedura; má `stayId?` (Phase 8: nullable) + `procedureRoomId?`; `deletedAt` | cuid | scheduling                                         |

### Conflict detection typy

| Typ                     | Kontroluje                                                    | Tier-specific |
| ----------------------- | ------------------------------------------------------------- | ------------- |
| `therapist_unavailable` | `TherapistAvailability` — den v týdnu a pracovní hodiny       | vždy          |
| `therapist_time_off`    | `TherapistTimeOff` — overlap s nepřítomností                  | vždy          |
| `therapist`             | `ProcedureSchedule` — terapeut má jiný termín ve stejnou dobu | vždy          |
| `patient`               | `ProcedureSchedule` — pacient má jiný termín ve stejnou dobu  | vždy          |
| `room`                  | `ProcedureSchedule` — procedurní místnost je obsazena         | vždy          |
| `procedure_capacity`    | `Procedure.capacity` — souběžný počet pacientů přes capacity  | vždy          |
| (stay-bound checks)     | obsazenost pokoje pobytem, etc.                               | jen full tier |

Implementace: `src/modules/scheduling/lib/conflictDetection.ts`.

---

## Prescription Planner (v0.10, SE-7)

Lékař vyplní předpis a systém z něj **automaticky rozpočítá celý pobyt** — z 30 min plánování na 3 min.

### Doménový model

```
PrescriptionTemplate ──< PrescriptionTemplateItem >── Procedure
                                                         │
Prescription >── Patient                                 │
             >── Stay                                    │
             >── User (doctor)                           │
             >── PrescriptionTemplate? (volitelná vazba) │
             ──< PrescriptionItem ─────────────────────────┤
                          │                              │
                          └──< ProcedureSchedule ────────┘
                              (prescriptionItemId nullable)
```

- `Prescription` = jeden lékařský předpis pro konkrétní pobyt
- `PrescriptionItem` = jedna procedura v předpisu se `repetitions` (kolikrát během pobytu) a `preferredTime`
- `PrescriptionTemplate` + `PrescriptionTemplateItem` = znovupoužitelné protokoly (seed: "Rehabilitace zad", "Wellness týden", "Pohybový aparát")
- Každý vytvořený `ProcedureSchedule` má volitelný `prescriptionItemId` → traceability "tahle procedura vznikla z téhle položky předpisu"

### Algoritmus rozpočtu

Identický se `createBatchSchedules` v `src/modules/scheduling/actions/scheduleActions.ts:349`:

1. Z `Stay.arrivalDate`–`departureDate` vyber všechny pracovní dny (Po–Pá)
2. Pro každou položku předpisu: `count = min(repetitions, weekdays.length)`, `stride = weekdays.length / count`
3. Pro každé `i ∈ [0, count)`: `dayIndex = floor(i * stride)` → rovnoměrné rozprostření přes pobyt
4. Pro každý slot zavolat `findConflicts()` (6 dimenzí); konflikty se neblokují, ale propagují do náhledu

### Flow

1. **Lékař** v kartě pacienta `/pacienti/[id]` klikne **+ Nový předpis** → `/predpis/novy?stayId=…`
2. Vybere šablonu (nebo začne prázdné) → tabulka položek se předvyplní
3. Upraví počty / terapeuty / preferované časy
4. Klik **Náhled rozpočtu** → `previewPrescription()` vrátí navrhované termíny + konflikty
5. U konfliktního slotu: **Skip** (přeskočit) nebo **Přesunout** → `FreeSlotPopover` s `findFreeSlots()` alternativami
6. Klik **Vytvořit předpis** → `createPrescription()` v transakci: `Prescription` + `PrescriptionItem`(y) + `ProcedureSchedule.createMany`; audit log entry `prescription.create`; toast success; redirect na `/predpisy/[id]`

### Role v flow

| Role     | Co dělá                                                             | Permissions               |
| -------- | ------------------------------------------------------------------- | ------------------------- |
| Lékař    | Tvoří předpisy, viz list                                            | `prescription.write/read` |
| Recepční | Vidí list `/predpisy`, otvírá detail, ruší předpisy                 | `prescription.write/read` |
| Auditor  | Read-only přístup k předpisům                                       | `prescription.read`       |
| Terapeut | Beze změny — vidí denní plán s navázanými procedurami, mění statusy | `schedule.status`         |

### Auto-close stale schedules

`POST /api/cron/auto-close-schedules` (shared secret `CRON_SECRET`) — denně přepne `ProcedureSchedule.status = 'planned'` na `'completed'` pro záznamy s `date < today`. Audit log entry `cron.auto_close_schedules`. Konfigurace v `docs/RUNBOOK.md#8`. Phase 9: bude přesunuto za pg-boss queue beze změny API.
