# Memory System – Lázeňské procedury

## Co si pamatovat v budoucích konverzacích

Tento soubor slouží jako persistence kontextu pro budoucí práci na projektu.

### Projekt

- **Název:** Lázeňské procedury (lazenska-app)
- **Tech:** Next.js 16 + Prisma + SQLite + React 19
- **Port:** 3000 (default Next.js)
- **Primární funkcionalita:** Plánování wellness procedur v lázeňství
- **Seed data:** 3 terapeuta, 4 pacienti, 6 procedur (viz `prisma/seed.ts`)

### Klíčové soubory

| Cesta | Účel |
|-------|------|
| `src/app/planovani/page.tsx` | Hlavní scheduling interface |
| `src/app/api/konflikty/route.ts` | Detekce konfliktů API |
| `src/actions/` | Server Actions pro všechny CRUD operace |
| `prisma/schema.prisma` | Data model (Patient, Therapist, Procedure, Schedule) |
| `prisma/seed.ts` | Inicializace testovacích dat |

### Data struktura

Čtyři hlavní entity:
1. **Patient** – základní info (jméno, pokoj, příjezd/odjezd)
2. **Therapist** – terapeut s barevným kódem + dostupnost po dnech týdne
3. **Procedure** – typ procedury (masáž, hydroterapie apod.) + doba trvání
4. **ProcedureSchedule** – naplánovaná procedura (pacient + terapeut + procedura + čas)

### Ważní varování z AGENTS.md

- Projekt používá **Next.js 16**, která má breaking changes
- Vždy si přečti relevantní dokumentaci v `node_modules/next/dist/docs/` před psaním kódu
- Věnuj pozornost deprecation notices

### Vývoj

- Dev server: `npm run dev` (port 3000)
- Build: `npm build`
- Seed: `npm run seed` (naplnění DB testovacími daty)

### Záclona conhecement o technologiích

- **UI:** Radix UI + TailwindCSS 4
- **Validace:** Zod
- **Datum:** date-fns (v seed.ts se počítá s pondělím jako start týdne)
- **Icons:** lucide-react

## Konverzační kontext (smazat po další session)

Projekt byl právě inicializován (`91e69cc Init: Complete spa scheduling app with Next.js, Prisma, conflict detection`). Zatím se liší od boilerplate Next.js vytváření custom datovými modely a scheduling logikou.
