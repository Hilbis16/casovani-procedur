# Migration log

Append-only log: každá Prisma migrace, datum, důvod, rollback postup.

---

## `20260511180041_phase8_nullable_stayid` — Phase 8 (Modular Tiers)

**Datum:** 2026-05-11
**Soubor:** `prisma/migrations/20260511180041_phase8_nullable_stayid/migration.sql`
**Obsah:** `ProcedureSchedule.stayId String` → `String?` (nullable)
**Důvod:** scheduling-only tier plánuje procedury bez kontextu pobytu; Stay entita není vyžadována
**Rollback:** Dev — `prisma migrate reset`; Prod — ALTER TABLE `procedure_schedules` ALTER COLUMN `stayId` SET NOT NULL (pouze pokud žádný NULL existuje)

---

## Wave A — Phase 1 (plánováno)

**Datum:** TBD  
**Obsah:** Přidání auth entit — Facility, User, Role, Permission, UserRole, Session, AuditLog  
**Důvod:** Autentizace, auditní log, RBAC — požadavek GDPR Art. 32 a §53 Z. 372/2011  
**Rollback:** `prisma migrate resolve --rolled-back <migration_name>` + DROP TABLE pro nové entity

---

## `20260511125322_init` — Phase 3 (Wave B schema reset)

**Datum:** 2026-05-11  
**Soubor:** `prisma/migrations/20260511125322_init/migration.sql`  
**Obsah:** Kompletní Wave B schema:

- Nové modely: `Building`, `Room` (enum kind: patient_room/procedure_room/office), `Stay` (code, patientId, roomId, arrivalDate, departureDate, status enum, deletedAt), `TherapistTimeOff`
- Všechna ID: `String @default(cuid())` (bylo `Int @default(autoincrement())`)
- `Patient`: odstraněny sloupce `roomNumber`, `building`, `arrivalDate`, `departureDate`; přidáno `deletedAt`
- `ProcedureSchedule`: přidáno `stayId String` (required FK na Stay), `procedureRoomId String?` (FK na Room), `deletedAt`
- Indexy: (patientId, date), (therapistId, date), (procedureRoomId, date), (stayId), (deletedAt)
- Status enum: ScheduleStatus (PLANNED/CONFIRMED/COMPLETED/CANCELLED/NO_SHOW), StayStatus (PLANNED/CHECKED_IN/CHECKED_OUT/CANCELLED), RoomKind
  **Důvod:** Separace pobytu od pacienta; příprava pro hotel modul; string IDs pro cuid; soft-delete; room scheduling  
  **Reset:** Smazány 3 předchozí migrace (20260508165632_init, 20260511111718_wave_a_auth_audit, 20260511111719_audit_log_trigger). Dev DB resetována (`prisma migrate reset`).  
  **Rollback:** Jen dev — `docker compose down -v && docker compose up -d && npx prisma migrate dev`  
  **Poznámka:** Existující SQLite/dev data nebyla zachována (jen testovací seed data). Seed přepsán — vytváří Building → Room → Therapist → Patient → Stay → Procedure → ProcedureSchedule.

---

## `20260508165632_init` — Phase 0 (PostgreSQL baseline)

**Datum:** 2026-05-08  
**Soubor:** `prisma/migrations/20260508165632_init/migration.sql`  
**Obsah:** Kompletní initial schema pro PostgreSQL — Patient, Therapist, TherapistAvailability, Procedure, ProcedureSchedule  
**Důvod:** Přechod z SQLite na PostgreSQL (dev/prod parita); stará SQLite migrace `20260423211445_init` smazána  
**Rollback:** Jen pro dev — `docker compose down -v` smaže volume + data; `docker compose up -d && npx prisma migrate dev`  
**Poznámka:** Port dev PostgreSQL je **5435** (5432 obsazen lokálním postgres.exe). `DATABASE_URL` v `.env` musí obsahovat `localhost:5435`.
