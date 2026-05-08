# Migration log

Append-only log: každá Prisma migrace, datum, důvod, rollback postup.

---

## Wave A — Phase 1 (plánováno)

**Datum:** TBD  
**Obsah:** Přidání auth entit — Facility, User, Role, Permission, UserRole, Session, AuditLog  
**Důvod:** Autentizace, auditní log, RBAC — požadavek GDPR Art. 32 a §53 Z. 372/2011  
**Rollback:** `prisma migrate resolve --rolled-back <migration_name>` + DROP TABLE pro nové entity

---

## Wave B — Phase 3 (plánováno)

**Datum:** TBD  
**Obsah:** Stay, Room, Building, TherapistTimeOff; soft-delete; indexy; CHECK constraints  
**Důvod:** Příprava pro hotelový modul; separace pobytu od pacienta  
**Rollback:** Backfill skript pro obnovení stay fields na Patient, DROP nových tabulek

---

## `20260508165632_init` — Phase 0 (PostgreSQL baseline)

**Datum:** 2026-05-08  
**Soubor:** `prisma/migrations/20260508165632_init/migration.sql`  
**Obsah:** Kompletní initial schema pro PostgreSQL — Patient, Therapist, TherapistAvailability, Procedure, ProcedureSchedule  
**Důvod:** Přechod z SQLite na PostgreSQL (dev/prod parita); stará SQLite migrace `20260423211445_init` smazána  
**Rollback:** Jen pro dev — `docker compose down -v` smaže volume + data; `docker compose up -d && npx prisma migrate dev`  
**Poznámka:** Port dev PostgreSQL je **5435** (5432 obsazen lokálním postgres.exe). `DATABASE_URL` v `.env` musí obsahovat `localhost:5435`.
