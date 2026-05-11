# Lázeňské procedury

Aplikace pro plánování a správu wellness procedur v lázeňských zařízeních. Modulární monolit připravený na tři licenční tiery (jen ambulantní plánování / jen ubytování / kompletní balíček).

## Funkce

- **Pacienti** — evidence pacientů (jméno, poznámky, soft-delete; PII šifrované AES-256-GCM)
- **Terapeuté** — pracovní doba, nepřítomnost, barevné kódování
- **Procedury** — katalog (masáže, hydroterapie, elektroterapie, …) s dobou trvání
- **Plánování** — týdenní grid, detekce konfliktů (terapeut / pacient / místnost / dostupnost / dovolená)
- **Ubytování** — pobyty, pokoje, budovy (modul `hotel`)
- **Audit log** — append-only, §53 z. 372/2011
- **RBAC** — 5 rolí (admin / lékař / terapeut / recepční / auditor)
- **GDPR** — SAR export PDF, zásady ochrany osobních údajů
- **Auth.js v5** — credentials provider, argon2id, JWT sessions

## Tech stack

| Vrstva     | Volba                                     |
| ---------- | ----------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)        |
| UI         | React 19, Tailwind 4, Radix UI            |
| ORM        | Prisma 6.19                               |
| Databáze   | PostgreSQL 16 (Docker, port 5435)         |
| Auth       | Auth.js v5 (JWT strategy)                 |
| Encryption | `prisma-field-encryption` (`@47ng/cloak`) |
| Testy      | Vitest                                    |
| Lint       | ESLint flat config + Prettier + Husky     |

> ⚠️ Next.js 16 má breaking changes — viz `AGENTS.md`. `middleware.ts` přejmenován na `proxy.ts`.

## Quick start

```bash
# 1. Postgres v Dockeru (port 5435)
docker compose -f deploy/dev/docker-compose.yml up -d

# 2. Závislosti + DB
npm install
npx prisma migrate dev
npm run seed

# 3. Dev server
npm run dev   # → http://localhost:3002
```

Seed účty (z `.env`):

- `operator@system.local` / `ChangeMe123!` — OPERATOR
- `admin@facility.local` / `ChangeMe456!` — FACILITY_ADMIN

## Struktura modulů

```
src/modules/
  core/         # auth, RBAC, audit, GDPR, DB client, services
  scheduling/   # časování procedur (pacienti, terapeuti, plánování)
  hotel/        # ubytování (pobyty, pokoje, budovy)
  reporting/    # PDF export, dashboards
```

Hranice modulů vynucené ESLint `no-restricted-imports`: `scheduling` ↔ `hotel` jen přes `core/contracts/`.

## Dokumentace

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — modulová mapa, data model, tier matrix
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — operační příručka
- [`docs/INSTALL.md`](docs/INSTALL.md) — produkční nasazení
- [`docs/COMPLIANCE.md`](docs/COMPLIANCE.md) — GDPR + české zákony mapping
- [`docs/SECURITY.md`](docs/SECURITY.md) — STRIDE threat model
- [`docs/MIGRATION.md`](docs/MIGRATION.md) — Prisma migrace log
- [`docs/adr/`](docs/adr/) — Architecture Decision Records (0001–0008)
- [`plan.md`](plan.md) — živý tracker stavu projektu
- [`CHANGELOG.md`](CHANGELOG.md) — historie verzí

## npm scripty

```bash
npm run dev          # dev server (port 3002)
npm run build        # produkční build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npm run seed         # naplnit DB testovacími daty
```

## Licence

Proprietární. Self-hosted u klienta (single-tenant per facility, viz `docs/adr/0007-single-tenant.md`).
