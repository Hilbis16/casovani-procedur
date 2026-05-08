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

## Baseline — Phase 0

**Datum:** 2026-05-08  
**Obsah:** Přepnutí DB provideru z SQLite na PostgreSQL; existující schéma beze změn  
**Důvod:** Dev/prod parita, PostgreSQL funkce (indexy, CHECK constraints, pg-boss, šifrování)  
**Rollback:** Změna `provider` zpět na `sqlite` v `prisma/schema.prisma` (pouze pro dev)
