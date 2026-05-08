# ADR 0002 — Prisma jako ORM

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Aplikace potřebuje ORM s type-safe dotazy, migrační systémem a podporou field-level encryption pluginu.

## Rozhodnutí

Prisma 6 (upgrade z 5.22 v Phase 0). Migrace přes `prisma migrate dev/deploy`.

## Alternativy odmítnuty

- **Drizzle ORM:** Velmi dobrý kandidát, ale `prisma-field-encryption` plugin neexistuje pro Drizzle. Vlastní implementace AES-256-GCM je out of scope. Drizzle zvážit při případném refactoru po Phase 5.
- **TypeORM:** Složitější konfigurace, horší TypeScript inference, méně aktivní vývoj.
- **Supabase:** Self-hosted Supabase má ~10 kontejnerů; příliš těžké pro single-tenant self-hosted nasazení u klienta.

## Důsledky

Schéma je single source of truth v `prisma/schema.prisma`. Migrace jsou committed do gitu.
