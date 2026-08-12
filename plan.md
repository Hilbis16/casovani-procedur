# Stav projektu – živý tracker

Poslední aktualizace: 2026-05-15

---

## Aktuální stav

**Branch:** `feature/phase-8-modular-tiers`
**Poslední tag:** `v0.4.0` (tagy v0.5.0–v0.10.0 dosud nevytvořeny)
**DB:** PostgreSQL 16 v Dockeru (port 5435) — poslední migrace `20260514120000_prescription_planner`
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
- **Phase 8**: Modular Tiers — `ENABLED_MODULES` flag, nullable `stayId`, route guard, UI gating
- **SE-6**: Suggest free slots — `findFreeSlots()` s 15min kroky + inline návrhy při konfliktu
- **SE-8**: Per-therapist daily print — `/terapeuti/[id]/tisk`, `getDaySchedules()`
- **SE-7**: Prescription Planner — šablony předpisů, auto-rozprostření přes pobyt, náhled konfliktů, Skip/Přesunout, recepční list `/predpisy` + detail se stornem
- **Auto-close cron** — `POST /api/cron/auto-close-schedules` přepne staré PLANNED → COMPLETED
- **Toast rollout** — `sonner@2.0.7` ve všech formulářích a akcích: `PrescriptionForm`, `CancelPrescriptionButton`, `StatusButtons`, `AppointmentForm`, `RecurringProcedureForm`, `StaySchedulePlanner`, `PatientForm`, `TherapistForm`, `ExportPatientButton`
- **Smart default terapeuta** — `PrescriptionItemsTable` + `StaySchedulePlanner` auto-vyplní prvního terapeuta při výběru procedury
- **Empty states** — `/prehled` (víkend/prázdný, 3 CTA), `/pacienti` (ikona + popis + CTA)
- **Escape import fix (2. průchod)** — odstraněno zbývajících ~13 výskytů `\/` v import cestách
- ESLint + Prettier + Husky (pre-commit hook)
- Vitest — **21/21 testů** (conflictDetection 13 + prescriptionActions 8)
- `npm run lint` ✅ | `npm run typecheck` ✅ | `npm test` ✅

### Dev prostředí — spuštění

```bash
docker compose -f deploy/dev/docker-compose.yml up -d   # Postgres :5435 + Adminer :8080
npm run dev                                              # App → http://localhost:3002
```

---

## In progress

Nic — Phases 0–8 + SE-6/7/8 + quick win UX polish uzavřeny.

---

## Next up → Phase 9 — Production hardening

**Větev:** `feature/phase-9-production`
**Cíl:** Aplikace připravena pro produkční nasazení — rate limiting, background jobs, monitoring, Playwright e2e.

### Klíčové položky

| #   | Co                                                                        | Riziko  |
| --- | ------------------------------------------------------------------------- | ------- |
| 1   | **pg-boss** — background jobs (přesunout auto-close cron)                 | Střední |
| 2   | **Rate limiting** — middleware pro API routes (auth + cron endpointy)     | Nízké   |
| 3   | **pgBackRest** config v docker-compose.prod.yml                           | Nízké   |
| 4   | **Health endpoint** — rozšíření `/api/health` o DB latency + queue status | Nízké   |
| 5   | **Playwright e2e** — login flow + prescription wizard smoke test          | Střední |
| 6   | **Prisma 7 migrace** — `prisma.config.ts`, URL přesun                     | Střední |
| 7   | **Mobile UI** — WeeklyGrid responzivita (MVP audit #7)                    | Nízké   |
| 8   | **SE-2** Status workflow / **SE-4** Drag & drop reschedule                | Vysoké  |

---

## Backlog (Compliance proud)

| Phase | Co                                                                                     | Status        |
| ----- | -------------------------------------------------------------------------------------- | ------------- |
| 0     | Foundation (ESLint, Prettier, Vitest, CI, PostgreSQL)                                  | ✅ Hotovo     |
| 1     | Auth + audit + security headers                                                        | ✅ Hotovo     |
| 2     | RBAC (admin/lekar/terapeut/recepcni/auditor)                                           | ✅ Hotovo     |
| 3     | Schema Wave B: Stay, Room, Building, soft-delete, indexy, conflict detection rozšíření | ✅ Hotovo     |
| 4     | Modularizace do `src/modules/{core,scheduling,hotel,reporting}`                        | ✅ Hotovo     |
| 5     | Field-level encryption (Patient.note, Schedule.note)                                   | ✅ Hotovo     |
| 6     | GDPR UX (SAR export PDF, privacy policy, ExportPatientButton)                          | ✅ Hotovo     |
| 7     | Hotel modul skeleton (`/ubytovani`, `/ubytovani/novy`)                                 | ✅ Hotovo     |
| **8** | **Modular Tiers (ENABLED_MODULES flag, nullable stayId, Patient v core)**              | **✅ Hotovo** |
| 9     | Production hardening (rate limiting, pg-boss, pgBackRest, health)                      | Nespuštěno    |
| 10    | Deployment templates (docker-compose.prod, Caddy, INSTALL.md)                          | Nespuštěno    |
| 11    | Fleet management & operator tooling                                                    | Nespuštěno    |

---

## Backlog (Scheduling Excellence proud)

Compliance proud řeší, **aby aplikace SMĚLA běžet** v zdravotnickém zařízení. SE proud řeší, **proč si ji lázně KOUPÍ** — kvalita core domain.

| #    | Co                               | Business value                                                            | Status    |
| ---- | -------------------------------- | ------------------------------------------------------------------------- | --------- |
| SE-1 | Conflict detection v2            | ✅ implementováno v Phase 3 (5 dimenzí)                                   | ✅ Hotovo |
| SE-2 | Status workflow (5 stavů + akce) | Vykazování pojišťovně má jasná data                                       | ⏳ TODO   |
| SE-3 | Capacity & vytíženost dashboard  | Manažerka optimalizuje směny na základě dat                               | ⏳ TODO   |
| SE-4 | Drag & drop reschedule v gridu   | Recepční ušetří ~10 min/den drobnými přesuny                              | ⏳ TODO   |
| SE-5 | Recurring série group operations | Změny celé série (odjezd, výměna terapeuta) triviální                     | ⏳ TODO   |
| SE-6 | Suggest free slots               | Auto-řešení kolizí — recepční nehledá ručně                               | ✅ Hotovo |
| SE-7 | **Prescription planner**         | **30 min → 3 min plánování pobytu z předpisu. Hlavní prodejní argument.** | ✅ Hotovo |
| SE-8 | Per-therapist daily print        | Terapeuti vědí ráno co dělat — méně chaosu                                | ✅ Hotovo |

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
| 8   | Chybí toast notifikace                         | v0.10.x | ✅                  |
| 9   | Export není implementován                      | Phase 6 | ✅ (PDF SAR export) |
| 10  | Opakující se procedury nelze editovat          | SE-5    | ⏳                  |
| 11  | Prázdný stav `/prehled`                        | v0.10.1 | ✅                  |
| 12  | Validace dat pobytu (checkin > checkout)       | Phase 3 | ✅                  |
