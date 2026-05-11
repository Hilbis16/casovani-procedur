# Changelog – Lázeňské procedury

Všechny poznámkované změny v tomto projektu. Formát je inspirován [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

---

## [0.8.1] – 2026-05-11 — Audit bugů Phase 4–7

### Opraveno

- **Escapované importy** — `@\/modules\/...` nahrazeno správným `@/modules/...` v 11 souborech (scheduleActions, patientActions, therapistActions, procedureActions, adminActions, auditLogger, rbac/index, StayPlanningView, AppointmentForm, WeeklyGrid, api/konflikty/route)
- **ESLint module-boundary rule** — přepsána z globálního `warn` na správné cross-module `error`: `src/modules/scheduling/**` nesmí importovat z `hotel`, `src/modules/hotel/**` nesmí importovat ze `scheduling`; `src/app/**` není omezeno (integrační vrstva)
- **Test mock path** — `vi.mock('./prisma', ...)` opraveno na `vi.mock('@/modules/core/db/prisma', ...)` v `src/lib/conflictDetection.test.ts`; mock nefungoval po přesunu Prisma do `src/modules/core/db/`
- **`getStays` soft-delete** — přidán filtr `where: { deletedAt: null }`; dříve vracela i smazané záznamy
- **`createStay` bez autorizace** — přidán `checkPermission('patient.write')` a konzistentní return type `{ success: true, id } | { success: false, error }`
- **PDF export byl stub** — `exportPatientData` teď skutečně generuje PDF přes `renderToBuffer` a vrací base64; `ExportPatientButton` dekóduje na `Blob` a spustí stažení; `PatientDataPDF` opraven pro `Date` objekty a rozšířen o sekci procedur
- **`/ubytovani/novy` vedlo na 404** — vytvořena funkční stránka (server page + client formulář s výběrem pacienta, dat příjezdu/odjezdu, pokoje)
- **`/ubytovani` chybělo v navigaci** — přidáno do `MainNav`
- **`getRooms`** — přidána nová funkce do `src/modules/hotel/actions/stayActions.ts` pro výběr pokojů ve formuláři pobytu

---

## [0.8.0] – 2026-05-11 — Phase 7: Hotel modul skeleton

### Přidáno

- **Modul `hotel`** — vytvořena struktura `src/modules/hotel` pro budoucí hotelové funkce
- **`stayActions`** — Server Actions `createStay` a `getStays` pro správu pobytů
- **Stránka `/ubytovani`** — základní přehled pobytů s informacemi o kódu, pacientovi a termínu

---

## [0.7.0] – 2026-05-11 — Phase 6: GDPR UX

### Přidáno

- **Zásady ochrany osobních údajů** — veřejná stránka `/zasady-ochrany-osobnich-udaju` (GDPR čl. 13/14)
- **SAR export infrastruktura** — služba `getPatientFullData` (`src/modules/core/gdpr/sar.ts`) sbírá kompletní data pacienta; PDF šablona `PatientDataPDF` (`src/modules/reporting/pdf/`) generuje dokument přes `@react-pdf/renderer`
- **UI pro export** — `ExportPatientButton` v detailu pobytu pacienta (`/pacienti/[id]/pobyt`)

---

## [0.6.0] – 2026-05-11 — Phase 5: Field-level encryption

### Přidáno

- **Field-level encryption** — šifrování citlivých polí `Patient.note` a `ProcedureSchedule.note` pomocí `prisma-field-encryption`; pole označena direktivou `/// @encrypted` ve schématu
- **Prisma extension** — Prisma client rozšířen o `fieldEncryptionExtension` v `src/modules/core/db/prisma.ts`; šifrování/dešifrování je transparentní pro volající kód
- **Dokumentace** — `ENCRYPTION_KEY` doplněn do `.env.example` s instrukcí pro generování (`openssl rand -base64 32`)

---

## [0.5.0] – 2026-05-11 — Phase 4: Modularizace

### Změněno

- **Modulární monolit** — codebase refaktorován do struktury `src/modules/{core,scheduling,hotel,reporting}`:
  - `src/actions/*` → `src/modules/scheduling/actions/` a `src/modules/core/actions/`
  - `src/components/scheduling/*` → `src/modules/scheduling/components/`
  - `src/lib/conflictDetection.ts` → `src/modules/scheduling/lib/`
  - `src/lib/dateUtils.ts` → `src/modules/core/lib/`
  - `src/lib/prisma.ts` → `src/modules/core/db/prisma.ts`
- **Importy** — všechny importy napříč aplikací aktualizovány na nové cesty (`@/modules/core/...`, `@/modules/scheduling/...`)
- **ESLint** — `no-restricted-imports` cross-module boundary rule přidána (cross-module porušení jsou `error`)
- **Typování** — kompletní `npm run typecheck` po refaktoru pro zajištění stability

---

## [0.4.0] – 2026-05-11 — Phase 3: Schema redesign (Wave B)

### Přidáno

- **`Building`** — model pro budovy (code, name); seed: budovy A a B
- **`Room`** — model pro pokoje/procedurní místnosti (kind: patient_room / procedure_room / office; capacity; isActive)
- **`Stay`** — model pobytu pacienta oddělený od `Patient`; sloupce: code (čitelný `2026-XXXX`), patientId, roomId, arrivalDate, departureDate, status (planned / checked_in / checked_out / cancelled), deletedAt
- **`TherapistTimeOff`** — nepřítomnost terapeuta (startsAt, endsAt, reason)
- **Soft-delete** na `Patient`, `Stay`, `ProcedureSchedule` (pole `deletedAt DateTime?`)
- **Indexy** na (patientId, date), (therapistId, date), (procedureRoomId, date), (stayId), (deletedAt)
- **`procedureRoomId`** na `ProcedureSchedule` — volitelná vazba na procedurní místnost
- **`stayId`** (required) na `ProcedureSchedule` — povinná vazba na pobyt
- **Conflict detection rozšíření** (`src/lib/conflictDetection.ts`):
  - Kontrola `TherapistAvailability` (den v týdnu + pracovní hodiny) — nový typ `therapist_unavailable`
  - Kontrola `TherapistTimeOff` — nový typ `therapist_time_off`
  - Kontrola obsazenosti procedurní místnosti — nový typ `room`
- **13 Vitest testů** pro `conflictDetection.ts` (pokrytí: no-conflict, adjacent intervals, min overlap, unavailable day, outside hours, time off, room conflict)
- **`AppointmentForm`** — status selector v edit módu (planned / confirmed / completed / cancelled / no_show)
- **`PatientForm`** — přijímá `stay?: Stay | null`; arrivalDate/departureDate se pre-fill ze stay; odstraněny pole roomNumber/building
- **`StayPlanningView`** — přijímá `stay: Stay` prop místo čtení z `Patient`
- **`RecurringProcedureForm`** — přijímá `stay: Stay` prop

### Změněno

- **Všechna ID** migrována z `Int` na `String @default(cuid())` (Patient, Therapist, Procedure, ProcedureSchedule, TherapistAvailability, TherapistTimeOff)
- **`Patient`** — odstraněny sloupce: `roomNumber`, `building`, `arrivalDate`, `departureDate` (přesunuto do `Stay`)
- **`createSchedule` / `createRecurringSchedules`** — automaticky vyhledají aktivní `Stay` pro pacienta; vrátí chybu pokud pobyt neexistuje
- **`createPatient`** — zároveň vytvoří `Stay` s automaticky generovaným kódem `${year}-${XXXX}`
- **Migrace** — smazány 3 staré migrace (20260508165632_init, 20260511111718_wave_a_auth_audit, 20260511111719_audit_log_trigger); nahrazena jednou čistou `20260511125322_init`
- **Seed** — přepsán: vytváří Building → Room → Therapist → Patient → Stay → Procedure → ProcedureSchedule
- **`src/app/api/konflikty/route.ts`** — odstraněn `Number()` parsing ID parametrů
- **`prehled/page.tsx`** — odstraněno `s.patient.roomNumber` (neexistuje)

### Odstraněno

- Sloupce `Patient.roomNumber`, `Patient.building`, `Patient.arrivalDate`, `Patient.departureDate`
- Číselné (`Int`) primární klíče ve všech modelech

---

## [0.2.1] – 2026-05-08 (hotfix)

### Opraveno

- **Dev Postgres port 5435** — na lokálním stroji vývojáře byl obsazen port 5432 nativním `postgres.exe`; `deploy/dev/docker-compose.yml` přesunut na host port 5435
- **PostgreSQL migrace** — smazána stará SQLite migrace `20260423211445_init`; vytvořena čistá PostgreSQL migrace `20260508165632_init`

---

## [0.2.0] – 2026-05-08

### Přidáno

- **ESLint flat config** (`eslint.config.mjs`) — Next.js core-web-vitals + Prettier integrace; `no-restricted-imports` pro budoucí hranice modulů (Phase 0: warn)
- **Prettier** (`.prettierrc.json`, `.prettierignore`) — jednotný formát kódu
- **lint-staged + Husky** — automatický lint+format před commitem
- **Vitest** + `@testing-library/react` — unit test framework; 9 testů pro `conflictDetection.ts`
- **`.editorconfig`** — LF line endings, UTF-8, 2-space indent
- **`.env.example`** — dokumentované proměnné pro všechny fáze
- **`deploy/dev/docker-compose.yml`** — PostgreSQL 16 + Adminer pro dev prostředí
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint, typecheck, test, build na Node 22 s Postgres service
- **`docs/`** — kompletní skeleton: ARCHITECTURE.md, MIGRATION.md, SECURITY.md, COMPLIANCE.md, RUNBOOK.md, CONTRIBUTING.md, INSTALL.md
- **`docs/adr/0001–0008`** — Architecture Decision Records: PostgreSQL, Prisma, Auth.js, modulární monolit, field encryption, soft-delete, single-tenant, event bus

### Změněno

- **PostgreSQL** — databáze přepnuta z SQLite na PostgreSQL (`prisma/schema.prisma` provider)
- **Prisma 6.19.3** — upgrade z 5.22 na 6.x (latest stable před Prisma 7 breaking changes)
- **lucide-react** — opravena verze z `^1.9.0` na `^1.14.0`
- **`AppointmentForm.tsx`** — opravena React `set-state-in-effect` chyba (derivovaný `effectiveConflicts`)
- **`.gitignore`** — rozšířen o `*.db`, `*.db-journal`, `.claude/`

### npm skripty

- `lint` — `eslint src`
- `lint:fix` — `eslint src --fix`
- `format` — `prettier --write .`
- `typecheck` — `tsc --noEmit`
- `test` — `vitest run`

---

## [0.1.0] – 2026-04-24

### Přidáno

#### Datový model (Prisma ORM)

- **Patient** – model pro hosty lázeňství
  - Základní info: jméno, příjmení, číslo pokoje
  - Período pobytu: datum příjezdu, datum odjezdu
  - Poznámka (volitelná)
- **Therapist** – model pro terapeuta
  - Základní info: jméno, příjmení, telefon
  - Barevný kód (UI identifikace)
  - Příznak aktivity (isActive)
- **TherapistAvailability** – dostupnost terapeuta
  - Den v týdnu (1-7, 1 = pondělí)
  - Pracovní doba: start/end time
- **Procedure** – model pro wellness procedury
  - Název, kategorie (masáž, hydroterapie, elektroterapie apod.)
  - Trvání v minutách
  - Příznak aktivity
- **ProcedureSchedule** – naplánované procedury
  - Příslušnost: pacient, terapeut, procedura
  - Datum a časy (start/end)
  - Stav (planned/completed/cancelled)
  - Volitelná poznámka
  - Timestamps: createdAt, updatedAt

#### Backend & API

- Next.js 16 App Router setup
- TypeScript pro type safety
- SQLite databáze s Prisma 5.22
- Server Actions pro CRUD operace:
  - `src/actions/patientActions.ts`
  - `src/actions/therapistActions.ts`
  - `src/actions/procedureActions.ts`
  - `src/actions/scheduleActions.ts`
- API endpoint pro detekci konfliktů: `src/app/api/konflikty/route.ts`

#### Frontend

- **Layout & Navigation**
  - `src/components/layout/MainNav.tsx` – hlavní navigace
  - `src/app/layout.tsx` – root layout
- **Stránky**
  - `/` – home redirect na `/planovani`
  - `/planovani` – hlavní scheduling interface
  - `/pacienti` – seznam pacientů
  - `/pacienti/novy` – přidání nového pacienta
  - `/pacienti/[id]` – detail pacienta
  - `/pacienti/[id]/upravit` – úprava pacienta
  - `/procedury` – seznam procedur
  - `/procedury/nova` – přidání nové procedury
  - `/terapeuti` – seznam terapeutů
  - `/terapeuti/novy` – přidání nového terapeuta
  - `/terapeuti/[id]` – detail terapeuta
  - `/terapeuti/[id]/upravit` – úprava terapeuta
- **Komponenty**
  - `src/components/patients/PatientForm.tsx` – formulář pro pacienty

#### Styling & UI

- TailwindCSS 4 s PostCSS pluginem
- Radix UI komponenty:
  - React Dialog (modály)
  - React Select (dropdowny)
  - React Checkbox (checkboxy)
  - React Popover (popovers)
  - React Label (labely)
  - React Slot (composition)
- class-variance-authority (CVA) pro komponentní varianty
- Tailwind Merge pro klasický utility merging
- Lucide React pro ikony

#### Seed data

- Testovací script: `prisma/seed.ts`
- **3 terapeuta:**
  - Jan Novák (modrá) – 7:00–15:00 Po-Pa
  - Eva Kratochvílová (zelená) – 8:00–16:00 Po-Pa
  - Petra Svobodová (oranž) – 7:30–15:30 Po-So
- **4 pacienti:**
  - František Novák (pokoj 12) – týden před až týden po
  - Jana Svobodová (pokoj 7) – 3 dny před až 11 dní po
  - Tomáš Kratochvíl (pokoj 23) – 5 dní před až 9 dní po
  - Marie Bílá (pokoj 4) – v den seed až 14 dní po
- **6 procedur:**
  - Klasická masáž (60 min)
  - Perličková koupel (20 min)
  - Elektroléčba (30 min)
  - Magnetoterapie (20 min)
  - Reflexní masáž (45 min)
  - Vodoléčba (30 min)
- **11 naplánovaných procedur** – příklady pro UI

#### Konfigurace & nástrojů

- `.env.local` – lokální konfigurace (DATABASE_URL)
- `tailwind.config.js` – TailwindCSS config
- `tsconfig.json` – TypeScript config
- `next.config.js` – Next.js config
- `package.json` – npm scripts:
  - `npm run dev` – dev server
  - `npm run build` – build
  - `npm start` – production server
  - `npm run seed` – naplnění DB testovacími daty

### Vlastnosti

- ✅ Vytvoření, čtení, aktualizace, smazání pro všechny entity
- ✅ Detekce časových konfliktů terapeutů
- ✅ Kontrola dostupnosti terapeutů dle pracovní doby
- ✅ Responzivní UI s moderními komponenty
- ✅ Type-safe backend s TypeScript
- ✅ SQLite + Prisma ORM

### Poznámky

- **Next.js verzionování:** Projekt používá Next.js 16 s breaking changes, viž `AGENTS.md`
- **Produkční databáze:** SQLite je vhodná na development; pro produkci zvážit PostgreSQL
- **Struktura zdrojů:** Kód je organizován v `src/` adresáři s App Router konvencí
- **Seed skript:** Automaticky maže a znovu vytváří všechny testovací data pro čistý výchozí stav

---

## Formát verzionování

Projekt následuje [Semantic Versioning](https://semver.org/):

- **MAJOR** – Breaking změny v API nebo datovém modelu
- **MINOR** – Nové features zpětně kompatibilní
- **PATCH** – Bug fixů a opravy

## Pokyny pro budoucí zápisy

Při další aktualizaci changelagu:

1. Přidej nový oddíl `[X.Y.Z] – YYYY-MM-DD` pod `[Unreleased]`
2. Categorizuj změny do sekcí: **Přidáno**, **Změněno**, **Odstraněno**, **Opraveno**, **Bezpečnost**
3. Udržuj seznam sortovaný (nejnovější nahoře)
4. Odkazuj na commitů či pull requesty kde je to relevantní
