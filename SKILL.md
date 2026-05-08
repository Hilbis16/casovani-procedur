# Projekt Skills - Lázeňské procedury

## O projektu

**Název:** Lázeňské procedury (lazenska-app)  
**Typ:** Next.js 16 + Prisma ORM aplikace  
**Jazyk:** TypeScript, React  
**Port:** 3002 (výchozí Next.js: 3000)

## Co projekt dělá

Aplikace pro plánování a správu wellness procedur v lázeňských zařízeních. Spravuje:
- **Pacienty** – seznam hostů v lázeňství (pokoj, příjezd, odjezd, poznámky)
- **Terapeuta** – seznam dostupných terapeutů s jejich pracovní dobou a barevným kódováním
- **Procedury** – databáze procedur (masáž, hydroterapie, elektroterapie apod.) s dobou trvání
- **Plánování** – časový rozvrh procedur s detekací konfliktů

## Tech stack

```
Frontend:  Next.js 16 (App Router), React 19, TypeScript
Styling:   TailwindCSS 4, Radix UI komponenty (dialog, select, checkbox, popover, label, slot)
Backend:   Next.js API routes, TypeScript
DB:        SQLite + Prisma ORM 5.22
Utils:     date-fns (práce s daty), zod (validace), clsx/tailwind-merge
Icons:     lucide-react
CLI:       ts-node pro seed scripty
```

## Struktura projektu

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home (redirect na /planovani)
│   ├── layout.tsx                # Hlavní layout
│   ├── planovani/                # Hlavní scheduling stránka
│   ├── pacienti/                 # Správa pacientů
│   │   ├── page.tsx              # Seznam pacientů
│   │   ├── novy/page.tsx         # Nový pacient
│   │   └── [id]/                 # Detail pacienta
│   │       ├── page.tsx
│   │       └── upravit/page.tsx
│   ├── procedury/                # Správa procedur
│   │   ├── page.tsx              # Seznam procedur
│   │   └── nova/page.tsx         # Nová procedura
│   ├── terapeuti/                # Správa terapeutů
│   │   ├── page.tsx              # Seznam terapeutů
│   │   ├── novy/page.tsx         # Nový terapeut
│   │   └── [id]/                 # Detail terapeuta
│   │       ├── page.tsx
│   │       └── upravit/page.tsx
│   └── api/
│       └── konflikty/route.ts    # API endpoint pro detekci konfliktů
├── actions/                      # Server Actions
│   ├── patientActions.ts
│   ├── procedureActions.ts
│   ├── scheduleActions.ts
│   └── therapistActions.ts
├── components/
│   ├── layout/
│   │   └── MainNav.tsx
│   └── patients/
│       └── PatientForm.tsx
└── lib/                          # Utility funkce

prisma/
├── schema.prisma                 # ORM schéma
└── seed.ts                       # Seed script s testovacími daty

public/                           # Statické soubory
.next/                            # Build cache
node_modules/
```

## Data model (Prisma)

```
Patient
├── id, firstName, lastName, roomNumber
├── arrivalDate, departureDate
├── note (volitelný)
└── schedules: ProcedureSchedule[]

Therapist
├── id, firstName, lastName, phone
├── color (barevný kód pro UI)
├── isActive
├── availabilities: TherapistAvailability[]
└── schedules: ProcedureSchedule[]

TherapistAvailability
├── id, therapistId
├── dayOfWeek (1=pondělí...5=pátek)
├── startTime, endTime

Procedure
├── id, name, category (masaz, hydroterapie...)
├── durationMin (doba trvání)
├── isActive
└── schedules: ProcedureSchedule[]

ProcedureSchedule (Plánované procedury)
├── id
├── patientId, procedureId, therapistId
├── date, startTime, endTime
├── status (planned, completed, cancelled)
├── note (volitelný)
└── timestamps: createdAt, updatedAt
```

## Klíčové soubory pro vývoj

| Soubor | Účel |
|--------|------|
| `src/app/planovani/page.tsx` | Hlavní scheduling UI |
| `src/app/api/konflikty/route.ts` | Detekce časových konfliktů |
| `src/actions/*.ts` | Server Actions pro CRUD |
| `prisma/schema.prisma` | Data model |
| `package.json` | Dependencies, npm scripts |

## Příkazová řádka

```bash
# Spuštění dev serveru
npm run dev

# Build pro produkci
npm run build

# Start produkčního serveru
npm start

# Naplnění DB testovacími daty
npm run seed
```

## Seed data

Skript `prisma/seed.ts` automaticky vytvoří:
- **3 terapeuta** – Jan Novák (modrá), Eva Kratochvílová (zelená), Petra Svobodová (oranž)
- **4 pacienty** – František, Jana, Tomáš, Marie
- **6 procedur** – různé typy wellness procedur
- **11 naplánovaných procedur** – jako příklady pro UI

Spuštění: `npm run seed`

## Klíčové features

✅ **CRUD operace** – Přidávání, úpravy, mazání pacientů, terapeutů, procedur  
✅ **Plánování** – Tažení procedur do timeline, editace času  
✅ **Detekce konfliktů** – Upozornění na překrývající se procedury terapeuta  
✅ **Dostupnost terapeutů** – Omezení na pracovní dobu  
✅ **Responsive UI** – Tailwind + Radix komponenty  

## Poznámky pro vývoj

- Projekt používá **Next.js 16** – viz `AGENTS.md` pro breaking changes
- SQLite je vhodná pro development; pro produkci zvážit PostgreSQL
- Všechny server actions jsou v `src/actions/`
- Conflict detection je v `src/app/api/konflikty/`
- UI komponenty jsou z Radix UI s Tailwind stylingem
