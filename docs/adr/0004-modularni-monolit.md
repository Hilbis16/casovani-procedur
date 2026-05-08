# ADR 0004 — Modulární monolit (ne mikroslužby)

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Aplikace bude mít dva moduly (scheduling, hotel) které sdílejí entity (Patient, Stay, Room). Potřebujeme izolaci modulů bez zbytečné komplexity.

## Rozhodnutí

Modulární monolit: jeden Node.js proces, jedna databáze, hranice vynucené ESLintem. Komunikace přes `core/services/*` (sync) a `core/events/bus` (async).

## Alternativy odmítnuty

- **Mikroslužby:** 5–30 zaměstnanců, jeden server u klienta. Overhead orchestrace (Kubernetes, inter-service auth, distributed tracing) je neúměrný. Sdílené transakce napříč moduly (např. cancel stay + cancel schedules) by vyžadovaly saga pattern.
- **Monorepo bez hranic:** Bez vynucených hranic se moduly zamotají. ESLint `no-restricted-imports` dává výhody mikroslužeb (jasné kontrakty) bez overhead.

## Důsledky

Přechod na mikroslužby je možný v budoucnosti: moduly jsou navrženy jako izolované, kontrakty přes `core/contracts/*`, events přes bus. Refactor na Phase 8 (pg-boss outbox) je první krok k distribuované architektuře.
