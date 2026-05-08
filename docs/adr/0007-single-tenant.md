# ADR 0007 — Single-tenant per facility

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Aplikace bude nasazena do více zdravotnických zařízení. Možnosti: SaaS multi-tenant, nebo separátní instance per facility.

## Rozhodnutí

Single-tenant: každé zařízení dostane vlastní Docker instance + vlastní PostgreSQL databázi. Žádná `Tenant` tabulka. Místo toho `Facility` model (jeden řádek, branding/config).

## Alternativy odmítnuty

- **Multi-tenant (row-level security):** GDPR compliance komplikuje sdílení infrastruktury. Úniky dat mezi tenanty by měly katastrofální dopady ve zdravotnictví. Cross-tenant scoping v každém dotazu = trvalý bezpečnostní risk.
- **Multi-tenant (schema-per-tenant):** Správa migrací pro desítky schémat je operační noční můra.

## Důsledky

Správa více instancí (Fleet console — Phase 10). Každý klient má kompletní data izolaci. Update = deploy nové verze na každou instanci (automatizovaný přes Fleet).
