# ADR 0001 — PostgreSQL jako primární databáze

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

MVP používal SQLite. Pro produkci ve zdravotnictví je potřeba: transakční záruky (ACID), souběžné čtení/zápis od více personálu, CHECK constraints (validace časů), append-only triggery pro AuditLog, pg-boss pro background jobs a šifrování polí.

## Rozhodnutí

PostgreSQL 16 jako jediná databáze — dev i prod přes Docker Compose (parita prostředí).

## Alternativy odmítnuty

- **SQLite:** Nativní souběžné zápisy nejsou podporovány; žádné pokročilé triggery; WAL neumožňuje WAL archiving pro pgBackRest. Nevyhovuje §53 Z. 372/2011 (audit trail).
- **MySQL/MariaDB:** Slabší podpora JSONB; žádný pg-boss; horší ekosystém pro Prisma field encryption.

## Důsledky

Dev prostředí vyžaduje Docker (nebo lokální PostgreSQL). SQLite `dev.db` smazán a odstraněn z `.gitignore`.
