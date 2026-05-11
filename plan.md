# Stav projektu – živý tracker

Poslední aktualizace: 2026-05-11

---

## Aktuální stav

**Branch:** `feature/phase-1-auth`
**Poslední tag:** `v0.4.0` (tagy v0.5.0–v0.8.1 dosud nevytvořeny)
**DB:** PostgreSQL 16 v Dockeru (port 5435) — migrace `20260511125322_init`, seed OK
**CI:** GitHub Actions workflow připraven (`.github/workflows/ci.yml`)

### Co funguje

- Celý MVP — plánování, týdenní grid, recurring procedury
- **Phase 1**: Auth.js v5 + Credentials provider + PrismaAdapter, JWT strategy, audit log, security headers, proxy.ts (Next.js 16 konvence)
- **Phase 2**: RBAC — 5 rolí (admin/lekar/terapeut/recepcni/auditor), admin UI (`/spravce/`)
- **Phase 3 schema**: Building, Room, Stay, TherapistTimeOff, soft-delete, cuid IDs
- **Conflict detection** (rozšířená): therapist + patient + room + availability + time_off
- **Phase 4**: Modulární monolit `src/modules/{core,scheduling,hotel,reporting}`; ESLint cross-module boundary jako error
- **Phase 5**: Field-level encryption (`Patient.note`, `ProcedureSchedule.note`) via `prisma-field-encryption` + `@47ng/cloak`
- **Phase 6**: GDPR — stránka zásad, SAR export (PDF ke stažení), `ExportPatientButton` v pobytu pacienta
- **Phase 7**: Hotel modul skeleton — `/ubytovani` přehled, `/ubytovani/novy` formulář, `stayActions`
- ESLint + Prettier + Husky (pre-commit hook)
- Vitest — **13/13 testů** (conflictDetection)
- `npm run lint` ✅ | `npm run typecheck` ✅ | `npm test` ✅

### Dev prostředí — spuštění

```bash
docker compose -f deploy/dev/docker-compose.yml up -d   # Postgres :5435 + Adminer :8080
npm run dev                                              # App → http://localhost:3002
```

---

## In progress

Nic — Phases 0–7 + bug fixy uzavřeny.

---

## Next up → Phase 8 — Modular Tiers

**Větev:** vytvořit `feature/phase-8-modular-tiers`
**Cíl:** Aplikace lze provozovat ve třech tier-ech:

1. **scheduling-only** — jen ambulantní plánování (bez pobytů)
2. **hotel-only** — jen ubytování
3. **full** — kombinace obou (premium balíček)

### Klíčová rozhodnutí

- **Flag**: ENV proměnná `ENABLED_MODULES="scheduling,hotel"` v `.env` (jedna instance = jeden zákazník)
- **`ProcedureSchedule.stayId` → nullable** — scheduling-only tier plánuje rovnou na pacienta bez kontextu pobytu
- **`Patient` přesun do `core`** — sdílená entita, oba moduly ji potřebují (hotel-only tier musí umět zakládat pacienty bez scheduling)
- **`core/contracts/` zůstane prázdná** — když je `stayId` nullable a Patient v core, scheduling nepotřebuje sahat do hotelu

### Kroky

| #   | Krok                                                                         | Soubory                                                                                                   | Riziko  |
| --- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- |
| 1   | DB migrace: `ProcedureSchedule.stayId` → `String?` nullable                  | `prisma/schema.prisma` + nová migrace                                                                     | Nízké   |
| 2   | Přesun Patient do core                                                       | `scheduling/actions/patientActions.ts` → `core/actions/`; update ~15 importů                              | Střední |
| 3   | Feature flag modul `core/features/index.ts`                                  | nový soubor; čte `process.env.ENABLED_MODULES`                                                            | Nízké   |
| 4   | `.env` + `.env.example` rozšířit o `ENABLED_MODULES`                         | konfigurace                                                                                               | Nízké   |
| 5   | Route guard v `proxy.ts`                                                     | `/ubytovani/*` 404 když hotel off; `/planovani`,`/procedury` 404 když scheduling off                      | Nízké   |
| 6   | UI gating v `MainNav.tsx`                                                    | conditional nav items                                                                                     | Nízké   |
| 7   | Scheduling bez Stay                                                          | `AppointmentForm`, `RecurringProcedureForm`: `stayId` optional; když hotel off → formulář pobyt nezobrazí | Střední |
| 8   | Server Action guards                                                         | každá hotel action zkontroluje `isModuleEnabled('hotel')`, scheduling stejně                              | Nízké   |
| 9   | RBAC: nové permissions `module:hotel`, `module:scheduling`                   | seed v `prisma/seed.ts`                                                                                   | Nízké   |
| 10  | Conflict detection: ignorovat `stayId` když je `null`                        | `scheduling/lib/conflictDetection.ts`                                                                     | Nízké   |
| 11  | Testy + update `docs/ARCHITECTURE.md` + `CHANGELOG.md` + `docs/MIGRATION.md` | testy, docs                                                                                               | Nízké   |
| 12  | Tag `v0.9.0`                                                                 | git                                                                                                       | Nízké   |

**DoD:** lze provozovat instanci jen s `ENABLED_MODULES="scheduling"` (hotel routy 404, nav skrývá Ubytování, planování bez pobytu funguje); stejně s `ENABLED_MODULES="hotel"` (scheduling routy 404, pacienti+pobyty funguje); default `"scheduling,hotel"` zachovává backward compat.

---

## Backlog (Compliance proud)

| Phase | Co                                                                                     | Status     |
| ----- | -------------------------------------------------------------------------------------- | ---------- |
| 0     | Foundation (ESLint, Prettier, Vitest, CI, PostgreSQL)                                  | ✅ Hotovo  |
| 1     | Auth + audit + security headers                                                        | ✅ Hotovo  |
| 2     | RBAC (admin/lekar/terapeut/recepcni/auditor)                                           | ✅ Hotovo  |
| 3     | Schema Wave B: Stay, Room, Building, soft-delete, indexy, conflict detection rozšíření | ✅ Hotovo  |
| 4     | Modularizace do `src/modules/{core,scheduling,hotel,reporting}`                        | ✅ Hotovo  |
| 5     | Field-level encryption (Patient.note, Schedule.note)                                   | ✅ Hotovo  |
| 6     | GDPR UX (SAR export PDF, privacy policy, ExportPatientButton)                          | ✅ Hotovo  |
| 7     | Hotel modul skeleton (`/ubytovani`, `/ubytovani/novy`)                                 | ✅ Hotovo  |
| **8** | **Modular Tiers (ENABLED_MODULES flag, nullable stayId, Patient v core)**              | **Next**   |
| 9     | Production hardening (rate limiting, pg-boss, pgBackRest, health)                      | Nespuštěno |
| 10    | Deployment templates (docker-compose.prod, Caddy, INSTALL.md)                          | Nespuštěno |
| 11    | Fleet management & operator tooling                                                    | Nespuštěno |

---

## Backlog (Scheduling Excellence proud)

Compliance proud řeší, **aby aplikace SMĚLA běžet** v zdravotnickém zařízení. SE proud řeší, **proč si ji lázně KOUPÍ** — kvalita core domain.

| #    | Co                               | Business value                                                            | Effort    |
| ---- | -------------------------------- | ------------------------------------------------------------------------- | --------- |
| SE-1 | Conflict detection v2            | ✅ implementováno v Phase 3 (5 dimenzí)                                   | —         |
| SE-2 | Status workflow (5 stavů + akce) | Vykazování pojišťovně má jasná data                                       | 3–5 dní   |
| SE-3 | Capacity & vytíženost dashboard  | Manažerka optimalizuje směny na základě dat                               | 1 týden   |
| SE-4 | Drag & drop reschedule v gridu   | Recepční ušetří ~10 min/den drobnými přesuny                              | 1 týden   |
| SE-5 | Recurring série group operations | Změny celé série (odjezd, výměna terapeuta) triviální                     | 1 týden   |
| SE-6 | Suggest free slots               | Auto-řešení kolizí — recepční nehledá ručně                               | 1 týden   |
| SE-7 | **Prescription planner**         | **30 min → 3 min plánování pobytu z předpisu. Hlavní prodejní argument.** | 2–3 týdny |
| SE-8 | Per-therapist daily print        | Terapeuti vědí ráno co dělat — méně chaosu                                | 3–5 dní   |

Detailní specifikace jednotlivých SE položek byla v původním `ToDO.md` (souhrnný popis výše stačí pro plánování; implementační detaily si dohledáme až při zadávání konkrétního ticketu).

---

## Otevřené technické otázky

1. **Prisma 7** — breaking change (`url` v schema přesunuto do `prisma.config.ts`). Migrovat v Phase 9 nebo samostatně.
2. **Playwright** — odloženo; přidat před Phase 9 (e2e testy potřebují přihlašovací flow).
3. **Klíčový management `ENCRYPTION_KEY`** — rotace klíče, viz `docs/RUNBOOK.md`.
4. **Konkrétní retention windows** — ověřit s právníkem (GDPR čl. 5 odst. 1 písm. e).
5. **SAR export velikost** — pro pacienty s mnoha procedurami může být base64 payload velký; zvážit přesun na API route se streamingem v Phase 9.
6. **Tier licensing**: pokud někdy bude potřeba per-Facility flag (multi-tenant), bude nutné přesunout `ENABLED_MODULES` z `.env` do `Facility` modelu — odloženo, single-tenant zatím stačí.

---

## MVP audit — stav oprav

| #   | Problém                                        | Řeší    | Status              |
| --- | ---------------------------------------------- | ------- | ------------------- |
| 1   | Chybí autentizace                              | Phase 1 | ✅                  |
| 2   | Dostupnost terapeutů se nekontroluje           | Phase 3 | ✅                  |
| 3   | Chybí stránky terapeuta `/terapeuti/[id]`      | Phase 1 | ✅                  |
| 4   | `procedury/[id]/upravit` architekturální chyba | Phase 4 | ✅                  |
| 5   | Stav procedury nelze měnit z UI                | Phase 3 | ✅                  |
| 6   | Redundantní `/pacienti/[id]`                   | Phase 3 | ✅                  |
| 7   | WeeklyGrid není responzivní                    | Phase 9 | ⏳                  |
| 8   | Chybí toast notifikace                         | Phase 9 | ⏳                  |
| 9   | Export není implementován                      | Phase 6 | ✅ (PDF SAR export) |
| 10  | Opakující se procedury nelze editovat          | SE-5    | ⏳                  |
| 11  | Prázdný stav `/prehled`                        | Phase 9 | ⏳                  |
| 12  | Validace dat pobytu (checkin > checkout)       | Phase 3 | ✅                  |
