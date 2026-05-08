# ToDO – Lázeňské procedury

Kompletní akční plán pro postupnou transformaci MVP do produkční, GDPR/zákony-compliant aplikace pro česká zdravotnická zařízení s přípravou na pozdější hotelový modul.

> **Plánový soubor (read-only zdroj pravdy):** `C:\Users\HP-David\.claude\plans\hlavn-pot-ebuji-ud-lat-d-kladnou-sleepy-origami.md`
>
> Tento soubor je **akční checklist** — odškrtávat při dokončení. Při každém milníku aktualizovat `CHANGELOG.md` a `docs/MIGRATION.md`.

---

## Context

Aplikace je dnes funkční MVP (Next.js 16 + React 19 + Prisma 5 + SQLite). Všechny CRUD funkce, týdenní grid, recurring procedury i základní detekce konfliktů fungují.

**Cíl:** nasazení do českých zdravotnických zařízení musí splnit:
- GDPR (Nařízení EU 2016/679)
- Zákon č. 110/2019 Sb. (zpracování osobních údajů)
- Zákon č. 372/2011 Sb. (zdravotní služby — audit trail, RBAC)
- Vyhláška č. 98/2012 Sb. (retence zdravotnické dokumentace)
- NIS2 — připravit, neblokovat

Současně architektura musí být připravena na pozdější **hotelový modul** komunikující přes sdílené entity (Patient, Stay, Room, Building).

---

## Locked-in rozhodnutí

| # | Rozhodnutí | Hodnota |
|---|---|---|
| D1 | Tenancy | **Single-tenant per facility** (každé zařízení = vlastní instance, vlastní DB) |
| D2 | Databáze | **PostgreSQL od Phase 0** (i pro dev, přes Docker Compose) |
| D3 | Deployment | **Self-hosted Docker u klienta** |
| D4 | Velikost klienta | **Malé/střední (5–30 zaměstnanců)**, NIS2 architektonicky připraveno |

---

## Tech stack (cílový)

| Vrstva | Volba |
|---|---|
| Runtime | Node 22 LTS |
| Framework | Next.js 16 (App Router) — pozor na breaking changes vs. 14/15 |
| UI | React 19, Tailwind 4, Radix UI, lucide-react (oprava `^1.9.0` → `^0.462.0`) |
| Formuláře | `react-hook-form` + `@hookform/resolvers/zod` |
| Validace | zod (existující) |
| ORM | Prisma 6 (upgrade z 5.22) |
| Databáze | PostgreSQL 16 |
| Auth | Auth.js v5 (NextAuth), DB sessions, argon2id |
| Šifrování PII | `prisma-field-encryption` (AES-256-GCM, app-layer) |
| Background jobs | `pg-boss` (Postgres-native) |
| Logování | Pino + redakce |
| Error tracking | Sentry self-hosted (volitelně) |
| Storage | MinIO (Docker, S3-compatible) |
| TLS | Caddy auto-cert |
| Backupy | pgBackRest |
| Testy | Vitest + Playwright + testcontainers |
| Lint/format | ESLint flat config + Prettier + lint-staged + Husky |
| CI | GitHub Actions |

---

## Cílová architektura: modulární monolit

```
src/
  app/                       # tenké Next.js route shells
  modules/
    core/                    # sdílené jádro
      contracts/             # TS interfaces + zod schémata
      auth/  audit/  rbac/  events/  db/  services/  gdpr/  lib/
    scheduling/              # současný modul časování
      actions/  components/  lib/  schemas/
    hotel/                   # (Phase 7)
      actions/  components/  schemas/
    reporting/               # tisk, export, dashboardy
      components/  pdf/
  components/ui/             # design system
  middleware.ts              # auth gate, CSP nonce
```

**Pravidla závislostí (vynucená ESLint `no-restricted-imports`):**
- Modul může importovat z `@/modules/core/*` a `@/components/ui/*`.
- Modul **nesmí** importovat z jiného modulu.
- `src/app/` může importovat odkudkoli.
- Mutace Patient/Stay/Room/Building **vždy** přes `core/services/*`.

---

## Phase 0 — Foundation (1 týden)

**Cíl:** infrastruktura, kvalita kódu, parita dev/prod databáze.

### Tooling
- [ ] ESLint flat config + `eslint-plugin-import` + `no-restricted-imports` (zatím warn)
- [ ] Prettier + `.prettierrc.json`
- [ ] lint-staged + Husky pre-commit
- [ ] Vitest setup + sample test pro `conflictDetection.ts`
- [ ] Playwright setup + smoke test pro `/`
- [ ] GitHub Actions workflow: lint, typecheck, test, build (Node 22)

### Dependency hygiene
- [ ] Oprava `lucide-react` z `^1.9.0` na `^0.462.0`
- [ ] Upgrade Prisma 5.22 → 6.x
- [ ] `npm audit` cleanup

### Databáze
- [ ] Vytvořit `deploy/dev/docker-compose.yml`: postgres + adminer
- [ ] Přepsat `prisma/schema.prisma` provider z `sqlite` na `postgresql`
- [ ] Přepsat `prisma/seed.ts` pro Postgres (existující SQLite data se nezachrávají)
- [ ] Smazat `dev.db` z working tree
- [ ] Rozšířit `.gitignore` o `*.db`, `*.db-journal`

### Konfigurace
- [ ] Vytvořit `.env.example` se všemi required vars (DATABASE_URL, NEXTAUTH_SECRET, ENCRYPTION_KEY, ...)
- [ ] Dokumentovat env vars v `docs/CONTRIBUTING.md`

### Dokumentace skeleton (vytvořit `docs/` adresář)
- [ ] `docs/ARCHITECTURE.md` — modulová mapa, mermaid diagram
- [ ] `docs/adr/0001-postgres.md` — proč Postgres
- [ ] `docs/adr/0002-prisma.md` — proč Prisma 6
- [ ] `docs/adr/0003-authjs-v5.md` — proč Auth.js
- [ ] `docs/adr/0004-modular-monolith.md`
- [ ] `docs/adr/0005-app-layer-encryption.md`
- [ ] `docs/adr/0006-soft-delete.md`
- [ ] `docs/adr/0007-single-tenant-per-facility.md`
- [ ] `docs/adr/0008-event-bus.md`
- [ ] `docs/adr/0009-no-supabase.md` — proč ne Supabase (lean stack, self-host overhead)
- [ ] `docs/adr/0010-operator-controller-separation.md` — dvouvrstvý role model (Operator vs Facility)
- [ ] `docs/MIGRATION.md` — append-only log migrací (založit prázdný)
- [ ] `docs/RUNBOOK.md` — backup/restore/on-call (založit prázdný)
- [ ] `docs/CONTRIBUTING.md` — dev setup, branch policy, PR template
- [ ] `docs/INSTALL.md` — instalace u klienta (Docker Compose)
- [ ] `docs/SECURITY.md` — threat model, incident playbook (založit prázdný)
- [ ] `docs/COMPLIANCE.md` — GDPR mapping, retention schedule (založit prázdný)
- [ ] `docs/OPERATOR_HANDBOOK.md` — **interní příručka, nedává se klientům** (deployment, break-glass procedury, fleet management)
- [ ] `docs/templates/SMLOUVA_O_ZPRACOVANI.md` — DPA template per GDPR Art. 28 (podepisuje se s každým klientem)

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md` `[Unreleased]` o Phase 0 změny
- [ ] Tag `v0.2.0`

**DoD:** `npm run lint && npm test && npm run build` zelené v CI; `docker compose up` postaví dev prostředí; seed naplní Postgres.

---

## Phase 1 — Auth + audit + headers (2 týdny)

**Cíl:** žádný endpoint není veřejný, každý write je auditovaný.

### Schema migrace (Wave A)
- [ ] Přidat `Facility` model (jeden řádek, branding/config)
- [ ] Přidat `User`, `Role`, `Permission`, `UserRole`, `Session` modely
- [ ] Přidat `AuditLog` model s indexy
- [ ] Postgres trigger: `AuditLog` append-only (raise on UPDATE/DELETE)
- [ ] Prisma migrace `001_auth_audit`
- [ ] Záznam v `docs/MIGRATION.md`

### Auth.js v5
- [ ] Nainstalovat `next-auth@5`, adapter, argon2
- [ ] `src/modules/core/auth/config.ts` — Auth.js config
- [ ] `src/modules/core/auth/getCurrentUser.ts`
- [ ] Stránky: `/prihlaseni`, `/odhlaseni`, `/zapomenute-heslo`, `/zmena-hesla` (Czech UI)
- [ ] Email verify flow
- [ ] Password reset flow
- [ ] Seed admin user z env vars při prvním startu

### Audit log
- [ ] `src/modules/core/audit/auditLogger.ts` — writer
- [ ] `src/modules/core/audit/withAudit.ts` — wrapper na server actions
- [ ] Aplikovat `withAudit()` na všech existujících server actions:
  - [ ] `src/actions/patientActions.ts`
  - [ ] `src/actions/procedureActions.ts`
  - [ ] `src/actions/scheduleActions.ts`
  - [ ] `src/actions/therapistActions.ts`

### Security headers
- [ ] `next.config.ts` — CSP s nonce, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy
- [ ] `next.config.ts` — `experimental.serverActions.allowedOrigins`
- [ ] `src/middleware.ts` — auth gate (kromě `/prihlaseni`, `/api/health`, `/zasady-ochrany-osobnich-udaju`), CSP nonce per request

### Session security
- [ ] HttpOnly + Secure + SameSite=Lax cookies
- [ ] 12h sliding expiry
- [ ] Force re-auth před privilegovanými ops (delete patient, export data)

### Operator bootstrap
- [ ] Seed **OPERATOR** uživatele (David) z env vars `OPERATOR_EMAIL`, `OPERATOR_PASSWORD_HASH` při prvním startu
- [ ] Seed prvního **FACILITY_ADMIN** uživatele z env vars (klient si po loginu změní heslo)
- [ ] Operator login flow používá stejný `/prihlaseni`, ale po úspěchu redirectne na `/operator` (ne na `/planovani`)
- [ ] Operator session má jiný cookie scope (`operator-session`) — separace od facility user sessions

### Health endpoint
- [ ] `/api/health` route (DB + storage ping; veřejný)
- [ ] `/api/operator/heartbeat` (operator-only, podepsaný `OPERATOR_FLEET_TOKEN`) — vrací verzi, počet uživatelů, last-migration; **bez PII**

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.3.0`

**DoD:** všechny existující stránky vyžadují přihlášení; každý write produkuje řádek v `AuditLog`; CSP aktivní bez dev console errors; pokus o `UPDATE` na `AuditLog` v psql selže.

---

## Phase 2 — RBAC + break-glass (1.5 týdne)

**Cíl:** dvouvrstvý role model (Operator vs Facility); ne každý uživatel může všechno; vy (Operator) máte přístup k PII jen přes auditovaný break-glass.

### Dvouvrstvý role model

**System level (cross-facility, vlastní vy):**
- [ ] Seed role `OPERATOR` s permissions:
  - `operator.system.*` (deploy, migrate, restart, restore)
  - `operator.metrics.read` (vytížení, error rate, počty)
  - `operator.audit.metadata.read` (kdo se přihlásil — bez PII payloadů)
  - `operator.breakglass.activate` (spustit time-limited PII přístup)

**Facility level (within one zařízení, vlastní klient):**
- [ ] Seed role `FACILITY_ADMIN` s permissions:
  - `user.manage` (CRUD facility users)
  - `role.assign` (přiřazování klinických rolí)
  - `facility.config` (branding, contact, otevírací doba)
  - `audit.read` (čtení vlastního audit logu, **včetně operator přístupů**)
  - všechny clinical permissions

**Clinical roles (within facility):**
- [ ] Seed role `LEKAR` — read+write všechna pacientská data, `schedule.*`, `prescription.*`
- [ ] Seed role `TERAPEUT` — `schedule.read`, `schedule.update_status` (vlastní procedury), `patient.read` (jen vlastní pacienty)
- [ ] Seed role `RECEPCNI` — `patient.read+write`, `schedule.create+update`, `stay.read` (Phase 7+)
- [ ] Seed role `AUDITOR` — read-only `audit.read`, `patient.read` (s warning bannerem o důvodu)

### Permission infrastruktura
- [ ] Rozdělit `Permission.action` namespace: `operator.*` vs facility-level
- [ ] `src/modules/core/rbac/can.ts` — `can(user, action, resource)` helper
- [ ] `src/modules/core/rbac/ForbiddenError.ts`
- [ ] `src/modules/core/rbac/requireOperator.ts` — guard pro operator-only routes
- [ ] Aplikovat `can()` check na entry-pointu každé server action
- [ ] Operator nemůže defaultně volat clinical server actions (nevidí Patient.note v service responses) — service objekty PII redactují podle `user.role`

### Break-glass mechanismus
- [ ] Nový model `OperatorSession`:
  - `id`, `operatorId`, `reason` (text), `ticketId?`, `activatedAt`, `expiresAt`, `revokedAt?`, `notifiedFacilityAdmin: boolean`
- [ ] UI `/operator/breakglass`:
  - Form: důvod (povinný), ticket ID (volitelný), trvání (15min default, max 4h)
  - "Aktivovat support režim" → vytvoří `OperatorSession` row
  - Aktivní sessiona zobrazena jako warning banner napříč celou app
- [ ] Při aktivní `OperatorSession` operator dostane `patient.read` + `schedule.read.full` permissions přes session middleware
- [ ] Notifikace FACILITY_ADMINa: email "Operator David Hilbert aktivoval break-glass session, důvod: X. Session vyprší v Y" — okamžitě, ne s delay (transparentnost > rychlost)
- [ ] Každý PII přístup v rámci break-glass auditován s `meta.operatorSessionId` + `meta.reason`
- [ ] Auto-expire: cron každou minutu nuluje vypršené sessions
- [ ] Manuální revoke: FACILITY_ADMIN má tlačítko "Ukončit operator session"
- [ ] `/spravce/audit` zobrazuje sekci "Operator přístupy" — všechny operator sessions s důvody, časy, počtem dotčených záznamů

### Operator UI
- [ ] Routy `/operator/*` chráněné `requireOperator()` middleware
- [ ] `/operator` — dashboard (verze, last migration, last backup, počet aktivních uživatelů)
- [ ] `/operator/audit` — system-level audit (deploys, migrations, operator sessions)
- [ ] `/operator/breakglass` — break-glass aktivace + history vašich přístupů
- [ ] `/operator/system` — env, feature flags (toggle Sentry, …), maintenance mode

### Facility admin UI
- [ ] `/spravce/uzivatele` — CRUD facility users (FACILITY_ADMIN only)
- [ ] `/spravce/role` — read-only zobrazení rolí + permissions
- [ ] `/spravce/audit` — read-only `AuditLog`, **včetně sekce operator přístupů**
- [ ] `/spravce/facility` — config zařízení (branding, IČO, kontakty, DPO)

### Testy
- [ ] Playwright e2e `auth-rbac.spec.ts` — pokrývá všech 6 rolí (OPERATOR, FACILITY_ADMIN, LEKAR, TERAPEUT, RECEPCNI, AUDITOR)
- [ ] Test break-glass: bez session OPERATOR dostane 403 na `/spravce/pacienti`; s aktivní session OK; po expire 403
- [ ] Test redactionu: OPERATOR bez break-glass vidí v `/operator/audit` v `before/after` jen `[REDACTED]` na PII polích

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.4.0`

**DoD:** vy (OPERATOR) bez aktivní break-glass session nevidíte žádné PII; aktivace break-glass posílá email FACILITY_ADMINovi, expirace funguje; FACILITY_ADMIN vidí v audit logu kompletní historii vašich přístupů s důvody; klinické role mají správně omezené permissions.

---

## Phase 3 — Schema redesign + data migration (2 týdny)

**Cíl:** Stay/Room/Building entity, soft-delete, indexy, příprava pro hotel modul.

### Schema migrace (Wave B)
- [ ] Přidat `Building` model
- [ ] Přidat `Room` model + `RoomKind` enum (PATIENT_ROOM | PROCEDURE_ROOM | OFFICE)
- [ ] Přidat `Stay` model + `StayStatus` enum (PLANNED | CHECKED_IN | CHECKED_OUT | CANCELLED) + `code` business ID
- [ ] Přidat `TherapistTimeOff` model
- [ ] Přidat `ScheduleStatus` enum (PLANNED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW)
- [ ] Přidat `deletedAt`, `createdById`, `updatedById` na všechny entity
- [ ] Změnit FK CASCADE → RESTRICT na všech vazbách
- [ ] Přidat `procedureRoomId` na `ProcedureSchedule`
- [ ] Přidat `stayId` na `ProcedureSchedule`
- [ ] Strip stay polí z `Patient` (`roomNumber`, `building`, `arrivalDate`, `departureDate`)
- [ ] Indexy: `(patientId, date)`, `(therapistId, date)`, `(procedureRoomId, date)`, `(stayId)`, `(deletedAt)`
- [ ] CHECK constraints (raw SQL):
  - `chk_start_format` HH:MM regex
  - `chk_end_format` HH:MM regex
  - `chk_time_order` startTime < endTime
  - `chk_stay_dates` arrivalDate <= departureDate
  - `chk_patient_names` non-empty firstName/lastName
- [ ] Záznam v `docs/MIGRATION.md`

### Backfill skripty
- [ ] Vytvořit `Building` pro každý unikátní `Patient.building` a `Procedure.building`
- [ ] Vytvořit `Room` pro každou unikátní `(building, roomNumber)` kombinaci
- [ ] Vytvořit `Stay` per existující Patient (status podle `now()`)
- [ ] Backfill `ProcedureSchedule.stayId` joinem na (patientId, date)
- [ ] Smoke test: všechny `ProcedureSchedule.stayId` non-null

### Conflict detection rozšíření
- [ ] `src/lib/conflictDetection.ts` — přidat **room overlap** check
- [ ] Přidat **TherapistAvailability** check (existující bug — pole se načítá ale nikdy nevyhodnocuje)
- [ ] Přidat **TherapistTimeOff** check
- [ ] Unit testy: ≥10 cases v `conflictDetection.test.ts`

### UI fixy z `plan.md`
- [ ] `AppointmentForm` — přidat status field (planned/completed/cancelled) — fix #5
- [ ] `StayPlanningView` — číst ze `Stay`, ne z `Patient`
- [ ] `procedury/[id]/upravit` — přepsat z client na server component (fix #4)
- [ ] Stránky terapeuta `/terapeuti/[id]` a `/[id]/upravit` — pokud chybí, dotvořit (fix #3)
- [ ] Validace dat pobytu (checkin <= checkout) v zod (fix #12)

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.5.0`

**DoD:** všechny existující seed záznamy zmigrované; konflikty pokrývají therapist+patient+room+availability+timeoff; `vitest run` zelené; `AppointmentForm` umožňuje měnit status.

---

## Phase 4 — Module restructure (1 týden, mechanické)

**Cíl:** code base má `src/modules/{core,scheduling}` strukturu.

### Přesuny
- [ ] `src/actions/*` → `src/modules/scheduling/actions/`
- [ ] `src/components/scheduling/*` → `src/modules/scheduling/components/`
- [ ] `src/components/patients/*` → split mezi `core/components/` a `scheduling/components/`
- [ ] `src/lib/conflictDetection.ts` → `src/modules/scheduling/lib/`
- [ ] `src/lib/dateUtils.ts` → `src/modules/core/lib/`
- [ ] `src/lib/constants.ts` → split: app-wide do `core/lib/`, scheduling-specific do `scheduling/lib/`
- [ ] `src/lib/prisma.ts` → `src/modules/core/db/`

### Nové soubory
- [ ] `src/modules/core/services/patientService.ts`
- [ ] `src/modules/core/services/stayService.ts`
- [ ] `src/modules/core/services/roomService.ts`
- [ ] `src/modules/core/services/facilityService.ts`
- [ ] `src/modules/core/contracts/Patient.ts`
- [ ] `src/modules/core/contracts/Stay.ts`
- [ ] `src/modules/core/contracts/Room.ts`
- [ ] `src/modules/core/contracts/Building.ts`
- [ ] `src/modules/core/contracts/Facility.ts`
- [ ] `src/modules/core/contracts/events.ts` — DomainEvent union
- [ ] `src/modules/core/events/bus.ts` — in-memory pub/sub

### App routes refactor
- [ ] `src/app/*/page.tsx` na tenké shells (jen import + render z modules)

### ESLint
- [ ] Přepnout `no-restricted-imports` z warn na error
- [ ] Přidat path alias `@/modules/*` do `tsconfig.json`

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.6.0`

**DoD:** ESLint passes s module-boundary rule jako error.

---

## Phase 5 — Field-level encryption (1 týden)

**Cíl:** sensitive PII na disku nikdy v plaintextu.

- [ ] `npm install prisma-field-encryption`
- [ ] Annotace polí v `prisma/schema.prisma` (komentář `/// @encrypted`):
  - [ ] `Patient.note`
  - [ ] `Patient.birthNumber`
  - [ ] `ProcedureSchedule.note`
- [ ] Přidat `ENCRYPTION_KEY` do `.env.example`
- [ ] Dokumentovat key rotation v `docs/RUNBOOK.md`
- [ ] Migration: re-encrypt existing rows (dev seed znovu)
- [ ] Pino redakce paths: `*.note`, `*.birthNumber`, `*.firstName`, `*.lastName`, `*.passwordHash`, `cookie`, `authorization`
- [ ] Test: `pg_dump --data-only | grep birthNumber` → ciphertext only

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.7.0`

**DoD:** DB dump ukáže ciphertext sensitivních polí; reads přes Prisma vrací plaintext autorizovaným uživatelům.

---

## Phase 6 — GDPR UX (2 týdny)

**Cíl:** splnit GDPR Art. 13, 15, 17.

### Privacy & consent
- [ ] Stránka `/zasady-ochrany-osobnich-udaju` (Czech, schválené právníkem klienta)
- [ ] DPO kontakt v patičce všech stránek
- [ ] Patient consent record při vytvoření (`Patient.consents` JSONB pole)
- [ ] Cookie banner (jen pokud Sentry session replay nebo analytics zapnuté)

### Subject Access Request (SAR)
- [ ] `src/modules/core/gdpr/sar.ts` — export-all-data
- [ ] `/spravce/pacienti/[id]/export` — JSON + signed PDF
- [ ] `@react-pdf/renderer` integration v `src/modules/reporting/pdf/`

### Right to erasure
- [ ] `src/modules/core/gdpr/anonymize.ts` — replace name s `Pacient #cuid`
- [ ] Audit log zachován s původními hodnotami v `before`
- [ ] UI tlačítko v admin sekci s confirmation modal

### Compliance dokumenty
- [ ] `docs/COMPLIANCE.md` — GDPR článek → kód mapping, retention schedule, sub-processors list
- [ ] `docs/DPIA.md` — data flow diagram (mermaid), rizika, mitigace per data flow
- [ ] `docs/templates/SMLOUVA_O_ZPRACOVANI.md` — DPA template (GDPR Art. 28):
  - Vy = zpracovatel, klient = správce
  - Předmět zpracování (jaká data, za jakým účelem, doba)
  - Vaše povinnosti (důvěrnost, technická opatření, sub-processors)
  - Break-glass postup (kdy a jak smíte do PII)
  - Postup při incidentu (72h notifikace klientovi, klient ÚOOÚ)
  - Audit práva klienta
  - Konec zpracování (vrácení/smazání dat při ukončení smlouvy)
- [ ] Konzultovat DPA template s právníkem před prvním podpisem klientem
- [ ] `docs/templates/PROHLASENI_O_OCHRANE_DAT.md` — text pro patičku klientových stránek (kdo je správce, kontakt na DPO, jaká práva pacient má)

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.8.0`

**DoD:** SAR test patient produkuje kompletní export (JSON+PDF); erasure zanechá audit log neporušený, ale PII anonymizováno; právník klienta verifikuje privacy policy.

---

## Phase 7 — Hotel module skeleton (2 týdny)

**Cíl:** dokázat, že kontrakt s core funguje.

- [ ] Vytvořit `src/modules/hotel/` skeleton (actions, components, schemas)
- [ ] Stay CRUD UI v `/ubytovani`
- [ ] `/ubytovani/novy` — vytvoření stay (předtím v `pacienti/novy`)
- [ ] `RoomOccupancy` view v `/ubytovani/obsazenost` (Gantt diagram per room)
- [ ] Migrace UI: vytvoření stay už nejde z `pacienti/novy`, redirect na `/ubytovani/novy`
- [ ] Wire eventy:
  - [ ] `StayCancelled` → scheduling auto-cancel všech budoucích procedur (status=CANCELLED, audit `meta.reason="stay-cancelled"`)
  - [ ] `StayDatesChanged` → "needs review" task list pro out-of-range schedules
  - [ ] `RoomReassigned` → no-op ve scheduling
  - [ ] `ProcedureScheduled` → hotel může zaznamenat billing item (placeholder)
- [ ] Unit testy `eventBus.test.ts` pokrývají všechny subscribers

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.9.0`

**DoD:** vytvoření stay v `/ubytovani` se objeví v scheduling patient list; cancel cascaduje na procedure schedules přes event bus.

---

## Phase 8 — Production hardening (1.5 týdne)

**Cíl:** připraveno na ostrý provoz.

### Rate limiting
- [ ] `npm install rate-limiter-flexible`
- [ ] `src/modules/core/auth/rateLimit.ts` — Postgres backend
- [ ] Aplikovat na `/api/auth/*` a write server actions

### Error tracking (volitelně)
- [ ] Sentry self-hosted Docker Compose addon
- [ ] PII scrubbing v `beforeSend` hook

### Background jobs
- [ ] `npm install pg-boss`
- [ ] Nahradit in-memory event bus za **outbox pattern** (event row ve stejné transakci jako business write, worker drainuje)
- [ ] `src/modules/core/jobs/retention.ts` — nightly:
  - purge `AuditLog` > 10 let
  - anonymize `Stay` > 5 let po cancellu

### Backupy
- [ ] pgBackRest config (full + incremental + WAL archiving, šifrované)
- [ ] Offsite cíl (klient určí — vlastní S3? Externí provider?)
- [ ] Dokumentovat restore drill v `docs/RUNBOOK.md`
- [ ] Provést první restore drill end-to-end

### Health & monitoring
- [ ] Rozšířit `/api/health` o queue + storage ping
- [ ] Strukturované Pino logs do stdout (Docker log driver na disk klienta)

### Performance
- [ ] k6 load test 200 RPS baseline (dokumentovat v `docs/RUNBOOK.md`)

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v0.10.0`

**DoD:** restore drill kompletně proveden a zdokumentován; rate limiting blokuje brute-force na login; retention worker dry-run reportuje smazané řádky.

---

## Phase 9 — Deployment templates (1 týden)

**Cíl:** klient si nasadí instanci za hodinu.

### Docker Compose prod
- [ ] `deploy/docker-compose.prod.yml`: app + postgres + caddy + minio + pgbackrest
- [ ] `deploy/.env.example`
- [ ] `deploy/caddy/Caddyfile.example`
- [ ] `deploy/install.sh` — idempotent setup script

### Dokumentace
- [ ] `docs/INSTALL.md` — jednostránkový průvodce pro klientovo IT
- [ ] Upgrade procedura (zero-downtime nebo plánované okno)
- [ ] Smoke test post-deploy: curl `/api/health`, login, create test patient

### Verifikace
- [ ] Junior dev nasadí čistou facility instanci za <60 minut podle dokumentace
- [ ] Restore drill pro nasazenou instanci

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v1.0.0` — **první produkční release**

**DoD:** čerstvý VPS → `git clone && cp .env.example .env && docker compose up -d` → po <10 min běží na HTTPS.

---

## Phase 10 — Fleet management & operator tooling (1.5 týdne)

**Cíl:** vy (Operator) máte centrální přehled nad všemi nasazenými instancemi a nástroje pro vzdálenou správu.

### Fleet console (samostatná Next.js aplikace, ne pro klienty)

Žije v separátním repu nebo `apps/fleet/` v monorepu. Hostujete u sebe (Hetzner / vlastní VPS). **Nikdy neobsahuje PII.**

- [ ] Inicializovat `apps/fleet/` jako další Next.js 16 app (sdílí design system přes workspace)
- [ ] Auth jen pro vás (Operator) — Auth.js s magic link na váš email
- [ ] Model `FacilityInstance`:
  - `id`, `slug` (např. "lazne-trebon"), `name`, `contactEmail`, `dpaSignedAt`, `version`, `lastHeartbeat`, `lastBackup`, `healthStatus` (ok/warn/error), `apiKey` (pro heartbeat ověření)
- [ ] Routa `/instances` — tabulka všech klientů, filtrovatelná
- [ ] Detail instance: `/instances/[slug]`:
  - Aktuální verze + dostupný update
  - Health metriky (uptime, error rate, počet uživatelů, počet pacientů)
  - Last heartbeat, last backup
  - Tlačítka: "Spustit migraci", "Restart", "Force backup", "Aktivovat maintenance mode" — všechno přes podepsaný request na facility instanci

### Heartbeat outbound (z každé facility instance)

- [ ] Cron v každé facility instanci (pg-boss): každých 5 min `POST https://fleet.davidhilbert.cz/api/heartbeat`
- [ ] Payload (**bez PII**):
  ```json
  {
    "instanceId": "lazne-trebon",
    "version": "1.0.3",
    "uptime": 845200,
    "userCount": 12,
    "patientCount": 47,
    "scheduleCount24h": 89,
    "errorRate1h": 0.02,
    "lastBackupAt": "2026-05-08T03:00:00Z",
    "lastMigrationAt": "2026-05-01T22:14:00Z",
    "diskUsagePercent": 34
  }
  ```
- [ ] HMAC podpis přes `FLEET_HMAC_KEY` shared secret
- [ ] Fleet console verifikuje podpis, ukládá poslední snapshot
- [ ] Pokud `lastHeartbeat > 15 min` → fleet console pošle vám email alert

### Remote operations (operator → facility instance)

- [ ] Endpoint `/api/operator/*` na každé facility instanci (require `OPERATOR_FLEET_TOKEN` header):
  - `POST /api/operator/migrate` — spustí Prisma `migrate deploy`
  - `POST /api/operator/restart` — graceful restart aplikace
  - `POST /api/operator/backup` — force pgBackRest backup
  - `POST /api/operator/maintenance` — toggle maintenance mode (vrací 503 na vše kromě `/api/operator/*`)
  - `GET /api/operator/logs?since=...` — posledních N řádků z app logů (sanitizovaných, bez PII přes Pino redakci)
- [ ] Fleet console UI tlačítka volají tyto endpointy přes mTLS nebo signed JWT
- [ ] Každá operace auditována v cílové instanci (`AuditLog` s `actorId=null, action="operator.<op>", meta.operatorEmail=...`)

### Deployment automation

- [ ] CI build: po tagu `vX.Y.Z` zveřejnit Docker image na privátní registry (`ghcr.io/davidhilbert/lazenske-procedury:X.Y.Z`)
- [ ] Fleet console `/releases`:
  - Seznam tagů + changelog
  - Tlačítko "Deploy do staging klientů"
  - Tlačítko "Deploy do produkčních klientů" (after staging green for 7 days)
  - Per-client deploy schedule (nějací klienti chtějí update jen v sobotu noc)
- [ ] Facility instance: cron check `/api/operator/check-update` hourly; pokud nový tag → notifikace operatorovi (ne auto-update bez schválení)

### Operator tooling

- [ ] CLI nástroj `lazenske-fleet` (volitelně, ale pohodlné):
  - `lazenske-fleet list` — instances + status
  - `lazenske-fleet ssh <slug>` — wrapper na SSH s instance API key
  - `lazenske-fleet migrate <slug>`
  - `lazenske-fleet logs <slug>`
  - `lazenske-fleet backup <slug>`
- [ ] Lokální config `~/.lazenske/config.toml` s seznamem instancí + API keys

### Bezpečnost fleet komunikace

- [ ] mTLS mezi fleet console a facility instances (nebo signed JWT s short TTL)
- [ ] `OPERATOR_FLEET_TOKEN` per facility, rotovatelný
- [ ] Fleet console **nikdy** nepřijímá PII — schema validation odmítne payload s podezřelými poli (firstName, note, …)
- [ ] Fleet console má vlastní backup (váš VPS), oddělený od klientských dat

### OPERATOR_HANDBOOK obsah

- [ ] **interní dokument**, nedává se klientům
- [ ] Sekce: Onboarding nového klienta (DPA podpis → instance provisioning → seed admin)
- [ ] Sekce: Break-glass procedura (kdy aktivovat, jak zaznamenat ticket)
- [ ] Sekce: Incident response (klient nahlásí problém → vyhodnocení → break-glass nebo remote ops → resolution)
- [ ] Sekce: Upgrade procedura per klient
- [ ] Sekce: Offboarding klienta (export jeho dat, smazání instance, certifikát o smazání)
- [ ] Sekce: Eskalace (kdy zapojit právníka, kdy notifikovat ÚOOÚ)

### CHANGELOG
- [ ] Aktualizovat `CHANGELOG.md`
- [ ] Tag `v1.1.0`

**DoD:** vy z fleet console vidíte všech N nasazených klientů s posledním heartbeatem; remote migrate/backup/restart funguje na každém z nich; alert přijde do 15 min od výpadku heartbeatu; OPERATOR_HANDBOOK má všechny sekce sepsané.

---

## Scheduling Excellence (paralelní proud)

Compliance proud (Phase 0–9) řeší, **aby aplikace SMĚLA běžet** v zdravotnickém zařízení. Tento proud řeší, **proč si ji lázně KOUPÍ** — kvalita core domain (časování procedur).

Oba proudy jdou paralelně. SE úkoly se přidávají do sprintů ruku v ruce s compliance fázemi:

| Compliance | Doporučený SE souběh |
|---|---|
| Phase 1 (auth) | SE-2 (status workflow) — malé UI změny, neblokuje auth |
| Phase 2 (RBAC) | SE-3 (capacity dashboard) — využije RBAC pro permissions |
| Phase 3 (schema redesign) | **SE-1 (conflict v2)** — patří přímo do Phase 3 |
| Phase 4 (module restructure) | SE-4 (drag & drop) |
| Phase 5 (encryption) | SE-5 (recurring série editace) |
| Phase 6 (GDPR UX) | SE-6 (suggest free slots) |
| Phase 7 (hotel modul) | SE-7 (prescription planner) — **killer feature** |
| Phase 8 (hardening) | SE-8 (per-therapist daily print) |

---

### SE-1 — Conflict detection v2 (1 týden, součást Phase 3)

**Business value:** recepční přestane dělat ručně dohledatelné chyby (kolize místnost, neexistující pracovní doba, dovolená).

- [ ] `findConflicts` přidat **room overlap** dimenzi (`procedureRoomId`)
- [ ] Implementovat **TherapistAvailability** check (existující bug — pole se načítá ale nikdy nevyhodnocuje)
- [ ] Implementovat **TherapistTimeOff** check (po Wave B migraci)
- [ ] Conflict result struct: `{ kind: "therapist" | "patient" | "room" | "availability" | "timeoff", message, conflictingScheduleId? }`
- [ ] UI: barevné odlišení druhů kolizí v `AppointmentForm`
- [ ] Unit testy: ≥10 cases v `conflictDetection.test.ts` pokrývající všech 5 dimenzí

**Závislost:** Phase 3 schema (TherapistTimeOff entita).

**DoD:** pokus naplánovat (a) na neděli terapeutovi Po–Pá, (b) do obsazené místnosti, (c) do dovolené terapeuta vrátí jasnou chybu s lokalizovanou zprávou.

---

### SE-2 — Status workflow (3–5 dní, paralelně s Phase 1)

**Business value:** personál odškrtává procedury jak probíhají; podklad pro vykazování pojišťovně a interní reporting.

- [ ] Rozšířit `ScheduleStatus` enum: `PLANNED | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW`
- [ ] Přidat `confirmedAt`, `completedAt`, `cancelledAt`, `noShowAt`, `cancelReason` na `ProcedureSchedule`
- [ ] UI: status field v `AppointmentForm` (fix #5 z `plan.md`)
- [ ] UI: rychlé akce v `WeeklyGrid` na bloku — pravé kliknutí → "Označit jako dokončené" / "Pacient nepřišel" / "Zrušit"
- [ ] Status changes auditované přes `withAudit()` (Phase 1 prerequisite)
- [ ] Vizuální odlišení v gridu: planned (modrá), confirmed (modrá tlustší rámeček), completed (zelená), cancelled (šedá s přeškrtnutím), no_show (oranžová)
- [ ] V `StayPlanningView` filtr "Zobrazit jen [status]"

**Závislost:** Phase 1 audit log, Phase 3 enum migrace.

**DoD:** terapeut dokáže označit proceduru jako dokončenou na 1 klik z gridu; manažerka vidí v přehledu kolik no-show měl pacient za pobyt.

---

### SE-3 — Capacity & vytíženost dashboard (1 týden, paralelně s Phase 2)

**Business value:** manažerka vidí podvyužitého terapeuta nebo přetíženou místnost; data pro plánování směn a dovolených.

- [ ] Nová routa `/prehled/vytizenost`
- [ ] Per-terapeut týdenní pohled: `naplánované / dostupné hodiny` + procentní bar
- [ ] Per-procedurální místnost: obsazenost v % per den
- [ ] Filtr per týden, per kategorie procedur
- [ ] Export do CSV
- [ ] Permission `report.view` v RBAC (Phase 2) — admin, lékař, manažer

**Závislost:** Phase 2 RBAC, Phase 3 TherapistAvailability/TimeOff.

**DoD:** manažerka otevře `/prehled/vytizenost`, vidí "Novák — 32 % vytížení tento týden" a klikne na detail (které sloty jsou volné).

---

### SE-4 — Drag & drop reschedule (1 týden, paralelně s Phase 4)

**Business value:** drobné přesuny jdou za 2 sekundy místo 2 minut otevírání modálu.

- [ ] Použít knihovnu `@dnd-kit/core` (lehčí než react-dnd, accessible)
- [ ] V `WeeklyGrid` udělat bloky draggable
- [ ] Drop zóny: cell-level (15min slot)
- [ ] Při dragu real-time conflict check přes `/api/konflikty` (existující endpoint)
- [ ] Vizuální feedback: zelená když OK, červená když kolize, blokovaný drop při kolizi
- [ ] Permission check (`schedule.update`) před dropem
- [ ] Optimistic update + rollback při server error
- [ ] Audit log: `meta.via = "drag-drop"` aby se odlišilo od formulářové úpravy
- [ ] Mobile: long-press → drag (nebo zakázat na touch a doporučit desktop)

**Závislost:** Phase 4 module restructure (čistý import path), Phase 1 audit.

**DoD:** přetažení bloku v gridu na jiný čas funguje plynule; kolize blokuje drop s vysvětlením.

---

### SE-5 — Recurring série group operations (1 týden, paralelně s Phase 5)

**Business value:** když pacient odjede dřív nebo vymění terapeuta, jeden klik místo 10. Dnes #10 v `plan.md`.

- [ ] Přidat `seriesId` (cuid) na `ProcedureSchedule` — vyplní se při vytvoření přes `RecurringProcedureForm`
- [ ] Index `(seriesId, date)`
- [ ] Backfill seriesId pro existující schedules (heuristika: stejný patient+procedure+therapist+startTime v po sobě jdoucích dnech)
- [ ] UI: v detailu procedury zobrazit "Tato procedura je součást série N procedur (od X do Y)"
- [ ] Akce na sérii:
  - [ ] Smazat celou sérii (od dnešního data dál; minulé zachovat)
  - [ ] Přesunout sérii o N dní
  - [ ] Změnit terapeuta celé série (s conflict checkem per instance)
  - [ ] Změnit čas startu celé série
- [ ] Conflict preview: stejné UI jako `RecurringProcedureForm.checkRecurringConflicts`
- [ ] Audit log: `meta.seriesOperation = "shift" | "rebrand" | "delete"`

**Závislost:** žádná blokující.

**DoD:** pacient odjíždí dřív → admin smaže celou sérii od zítřka jedním kliknutím; vše zůstává auditované.

---

### SE-6 — Suggest free slots (1 týden, paralelně s Phase 6)

**Business value:** auto-řešení kolizí. Recepční nemusí ručně hledat alternativu.

- [ ] Nová funkce `suggestSlots(params: { procedureId, patientId, dateRange, preferredTherapistId? })` v `src/modules/scheduling/lib/`
- [ ] Algoritmus:
  1. Najdi všechny terapeuty schopné dělat tuto proceduru (zatím všichni — později ProcedureQualification)
  2. Pro každý den v rozsahu, projdi 15min sloty
  3. Filtruj sloty bez kolize (therapist, patient, room, availability, timeOff)
  4. Seřaď podle: preferovaný terapeut → ráno/odpoledne podle kategorie procedury → blízkost ostatních procedur pacienta téhož dne (minimalizovat čekání)
  5. Vrať top 5–10 návrhů
- [ ] V `AppointmentForm` při kolizi zobrazit tlačítko "Najít volný slot" → modal s návrhy
- [ ] Klik na návrh autopopuluje formulář
- [ ] Unit testy: `suggestSlots.test.ts` ≥8 případů

**Závislost:** SE-1 (conflict detection v2 jako filtr).

**DoD:** "Slot 10:00 obsazený" → tlačítko "Najít volný slot" → 3 návrhy → klik → formulář předvyplněný → uložit.

---

### SE-7 — Prescription planner (2–3 týdny, paralelně s Phase 7) — **KILLER FEATURE**

**Business value:** vstup ve formě lékařského předpisu ("10× klasická masáž, 5× perličková koupel za 14denní pobyt"), výstup celý rozvrh procedur. **Toto v ČR konkurence pořádně neumí.**

- [ ] Nový model `Prescription`:
  - `patientId`, `stayId`, `prescribedBy` (text — jméno lékaře), `prescribedAt`
  - relace `items: PrescriptionItem[]`
- [ ] `PrescriptionItem`:
  - `procedureId`, `count` (kolikrát celkem), `notes` (např. "ne hned po jídle")
  - `scheduledCount` (kolik už je naplánováno) — derived
- [ ] UI: `/pacienti/[id]/predpis` — formulář pro zadání předpisu (autocomplete proceduru, počet)
- [ ] `/pacienti/[id]/predpis/rozplan` — wizard:
  1. Zobrazit předpis a počty
  2. Tlačítko "Automaticky rozplánovat"
  3. Algoritmus rozdělí počty rovnoměrně přes pobyt s ohledem na:
     - Kategorii procedury (masáž → odpoledne, kondiční → dopoledne — konfigurovatelné per Procedure)
     - Minimum gap mezi stejnými procedurami (např. ne dvě masáže za sebou)
     - Maximum procedur na den pro pacienta (default 3)
     - Therapist availability + timeOff
  4. Preview všech navržených slotů jako tabulka s editovatelností
  5. Submit → batch insert všech schedules s `seriesId` a `prescriptionItemId`
- [ ] Při change v předpisu (přidat/ubrat počet) UI ukáže "naplánováno N z M" s tlačítkem "Doplánovat zbytek"
- [ ] Validace: pacient nemůže odjet s nesplněným předpisem (warning v `StayPlanningView`)
- [ ] Tisk předpisu jako součást patient schedule card

**Závislost:** SE-1, SE-6 (algoritmus návrhu slotů), Phase 3 schema, Phase 7 Stay entita.

**DoD:** recepční zadá 22 procedur z předpisu, klikne "Rozplánovat", do 5 sekund má návrh celého pobytu, ručně doladí 1–2 sloty, uloží. Celkem ~3 minuty místo 30 minut. Demo-able na první klientské schůzce.

---

### SE-8 — Per-therapist daily print (3–5 dní, paralelně s Phase 8)

**Business value:** terapeut má ráno na recepci/v ordinaci papír "Dnes mám tyto pacienty v těchto časech v těchto místnostech".

- [ ] Routa `/terapeuti/[id]/tisk` (paralela k existující `/pacienti/[id]/tisk`)
- [ ] Layout (tisková A4):
  - Hlavička: jméno terapeuta, datum, IČO/logo zařízení
  - Tabulka: čas | pacient (jméno + pokoj) | procedura | místnost | poznámka
  - Patička: počet procedur, celkový čas, místo na podpis
- [ ] Filter: jednotlivý den, týden, vybraný rozsah
- [ ] PDF export přes `@react-pdf/renderer` (Phase 6 už má integraci pro SAR)
- [ ] Permission: terapeut vidí jen vlastní; admin/manažer všechny
- [ ] Tlačítko "Tisk dnešního plánu pro všechny terapeuty" (admin) — generuje N PDF najednou

**Závislost:** Phase 6 PDF infrastruktura.

**DoD:** terapeut Novák ráno v 7:50 dostane na tablet/papír svůj rozvrh; tisk obsahuje vše potřebné, vejde se na A4.

---

### Souhrn business value SE proudu

| SE # | Co to lázním přinese |
|---|---|
| SE-1 | Recepční nedělá kolize — klesá počet stížností pacientů |
| SE-2 | Vykazování pojišťovně (proběhlé procedury) má jasná data |
| SE-3 | Manažerka optimalizuje směny terapeutů na základě dat |
| SE-4 | Recepční ušetří ~10 min/den drobnými přesuny |
| SE-5 | Změny celé série (odjezd, výměna terapeuta) jsou triviální |
| SE-6 | "Najít volný slot" = auto-řešení kolizí |
| SE-7 | **Plánování pobytu z předpisu = 30 min → 3 min.** Hlavní prodejní argument. |
| SE-8 | Terapeuti vědí ráno co mají dělat — méně chaosu |

---

## Bezpečnost & compliance — kontrolní matice

| # | Kontrola | Regulace | Phase | Effort |
|---|---|---|---|---|
| 1 | Auth.js v5 + DB sessions, argon2id | GDPR Art. 32, §16 Vyhl. 98/2012 | 1 | L |
| 2 | Audit log + `withAudit()` wrapper | §53 Z. 372/2011, GDPR Art. 30 | 1 | M |
| 3 | RBAC (5 rolí + `can()` helper) | §27 Z. 372/2011 | 2 | M |
| 4 | Security headers (CSP nonce, HSTS, ...) | NIS2 Annex, GDPR Art. 32 | 1 | S |
| 5 | CSRF (`serverActions.allowedOrigins`) | OWASP, GDPR Art. 32 | 1 | S |
| 6 | Rate limiting auth + write actions | NIS2 | 8 | S |
| 7 | App-layer encryption sensitive PII | GDPR Art. 32(1)(a), §5 Z. 110/2019 | 5 | M |
| 8 | TLS Caddy auto-cert + HSTS | GDPR Art. 32 | 9 | S |
| 9 | Session security (HttpOnly, Secure, ...) | §16 Vyhl. 98/2012 | 1 | S |
| 10 | Retention worker (audit, stays) | Vyhl. 98/2012 §3 | 8 | M |
| 11 | GDPR consent record per patient | GDPR Art. 6, 7 | 6 | M |
| 12 | Privacy policy + DPO kontakt | GDPR Art. 13 | 6 | S |
| 13 | SAR + right-to-erasure | GDPR Art. 15, 17 | 6 | L |
| 14 | DPIA dokument | GDPR Art. 35 | 6 | M |
| 15 | Breach response plan | GDPR Art. 33 | 6 | S |
| 16 | Backup + restore drill | NIS2 Art. 21 | 8 | M |
| 17 | Smazání `dev.db` z working tree, `.gitignore` | GDPR Art. 32 | 0 | S |
| 18 | Operator/Controller separace (vy = zpracovatel, klient = správce) | GDPR Art. 28 | 1, 2 | M |
| 19 | Break-glass mechanismus pro PII přístup | GDPR Art. 28(3)(b), §27 Z. 372/2011 | 2 | M |
| 20 | DPA template (Smlouva o zpracování) | GDPR Art. 28 | 6 | M |
| 21 | Fleet console **bez PII** + HMAC heartbeat | GDPR Art. 28(3)(c) | 10 | M |
| 22 | OPERATOR_HANDBOOK (interní procesní dokument) | NIS2 Art. 21 | 0, 10 | M |

---

## Co se NEbude dělat (záměrně mimo scope)

- Mikroslužby — modulární monolit stačí
- Multi-tenant SaaS — single-tenant per facility (D1)
- Vercel / serverless — self-hosted Docker (D3)
- Mobile app — později
- HL7/FHIR integrace — pouze pokud klient explicitně požádá
- NIA — jen pokud bude self-service patient portal
- Kubernetes — Docker Compose stačí
- Realtime websockets — Server Components + `router.refresh()` postačuje

---

## Otevřené otázky pro budoucí rozhodnutí

1. **Klíčový management `ENCRYPTION_KEY`** — externí KMS (HashiCorp Vault) nebo stačí env? Rozhodnout v Phase 5.
2. **Detailní seznam `Permission`** — finalizovat se zákazníkem v Phase 2.
3. **Konkrétní retention windows** pro `AuditLog`, `Patient` po anonymizaci, `Stay` po cancellu — ověřit s právníkem v Phase 6.
4. **Sentry self-hosted vs. žádný error tracking** — rozhodnout v Phase 8 podle preference klienta.
5. **Konkrétní offsite cíl pro pgBackRest** — rozhodnout v Phase 9 per klient.
6. **Strategie zero-downtime upgrade vs. plánované okno** — Phase 9.

---

## Aktuální stav

### Compliance proud (sequential)

- [x] Phase audit dokončen — viz `plan.md` (12 issues identifikovaných v MVP)
- [x] Architektonický plán schválen — viz `C:\Users\HP-David\.claude\plans\hlavn-pot-ebuji-ud-lat-d-kladnou-sleepy-origami.md`
- [ ] Phase 0 — Foundation (in progress)
- [ ] Phase 1 — Auth + audit + headers
- [ ] Phase 2 — RBAC
- [ ] Phase 3 — Schema redesign + data migration
- [ ] Phase 4 — Module restructure
- [ ] Phase 5 — Field-level encryption
- [ ] Phase 6 — GDPR UX
- [ ] Phase 7 — Hotel module skeleton
- [ ] Phase 8 — Production hardening
- [ ] Phase 9 — Deployment templates → **v1.0.0**
- [ ] Phase 10 — Fleet management & operator tooling → **v1.1.0**

### Scheduling Excellence proud (paralelně s Compliance)

- [ ] SE-1 — Conflict detection v2 (jde s Phase 3)
- [ ] SE-2 — Status workflow (jde s Phase 1)
- [ ] SE-3 — Capacity & vytíženost dashboard (jde s Phase 2)
- [ ] SE-4 — Drag & drop reschedule (jde s Phase 4)
- [ ] SE-5 — Recurring série group operations (jde s Phase 5)
- [ ] SE-6 — Suggest free slots (jde s Phase 6)
- [ ] SE-7 — **Prescription planner** (jde s Phase 7) — **KILLER FEATURE**
- [ ] SE-8 — Per-therapist daily print (jde s Phase 8)
