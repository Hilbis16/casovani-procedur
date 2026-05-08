# Architecture

## Overview

Modulární monolit — jeden Node.js proces, jedna PostgreSQL databáze, tvrdě vynucené hranice modulů přes ESLint `no-restricted-imports`.

## Module structure

```
src/
  app/                    # Tenké Next.js route shells
  modules/
    core/                 # Sdílené jádro (auth, audit, RBAC, services, events, GDPR)
    scheduling/           # Časování procedur (hlavní modul)
    hotel/                # Ubytování (Phase 7+)
    reporting/            # Tisk, export, dashboardy
  components/ui/          # Design system (Radix + Tailwind)
  middleware.ts           # Auth gate, CSP nonce, request ID
```

## Dependency rules

- Každý modul může importovat z `@/modules/core/*` a `@/components/ui/*`.
- Moduly nesmí importovat přímo z jiných modulů (`scheduling` ↔ `hotel` jen přes `core/contracts`).
- `src/app/` může importovat odkudkoli (composition root).
- Všechny mutace `Patient`, `Stay`, `Room`, `Building` jdou přes `core/services/*`.

Pravidla jsou vynucena ESLintem (`no-restricted-imports`): Phase 0–3 = warn, Phase 4+ = error.

## Inter-module communication

**Synchronní:** moduly volají `core/services/*` (typované service objekty).

**Asynchronní:** doménové eventy přes `core/events/bus`:

- Phase 1–7: in-memory synchronní bus
- Phase 8+: pg-boss outbox pattern

## Tech stack

| Vrstva     | Volba                                 |
| ---------- | ------------------------------------- |
| Framework  | Next.js 16 (App Router)               |
| UI         | React 19, Tailwind 4, Radix UI        |
| ORM        | Prisma 6                              |
| Databáze   | PostgreSQL 16                         |
| Auth       | Auth.js v5                            |
| Jobs       | pg-boss                               |
| Encryption | prisma-field-encryption (AES-256-GCM) |
| Logging    | Pino                                  |

## Data flow diagram

```
Browser → middleware.ts (auth gate) → Next.js App Router
         ↓
    Server Actions (entry point for RBAC + audit)
         ↓
    modules/core/services/* (business logic, transactions)
         ↓
    Prisma Client → PostgreSQL
         ↑
    modules/core/audit/* (append-only AuditLog)
```

Podrobnosti viz `docs/adr/` pro rozhodnutí a `docs/COMPLIANCE.md` pro GDPR mapování.
