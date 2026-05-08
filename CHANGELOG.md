# Changelog – Lázeňské procedury

Všechny poznámkované změny v tomto projektu. Formát je inspirován [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
