# ADR 0006 — Soft-delete místo CASCADE

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Ve zdravotnictví musí být data auditovatelná i po "smazání". Zákon č. 372/2011 Sb. a vyhláška 98/2012 vyžadují uchování zdravotnické dokumentace 5–100 let.

## Rozhodnutí

Soft-delete přes `deletedAt DateTime?` na `Patient`, `Stay`, `ProcedureSchedule`. Žádné CASCADE DELETE na health-related entitách. Fyzické smazání pouze přes retention worker po uplynutí zákonné doby.

## Alternativy odmítnuty

- **CASCADE DELETE:** Smazání pacienta by zničilo historii procedur. Nevyhovuje retenci.
- **Archivní tabulky:** Složitější schéma bez zjevné výhody pro tuto velikost aplikace.

## Důsledky

Všechny dotazy na Patient/Stay/ProcedureSchedule musí filtrovat `WHERE deletedAt IS NULL`. Prisma middleware bude přidán pro automatické filtrování (Phase 3). AuditLog je `append-only` — nikdy nemá `deletedAt`.
