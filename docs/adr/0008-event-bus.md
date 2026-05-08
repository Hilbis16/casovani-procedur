# ADR 0008 — In-memory event bus → pg-boss outbox

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Moduly potřebují asynchronně reagovat na doménové eventy (StayCancelled → cancel schedules). Řešení musí být transakcní: event nesmí být ztracen při pádu aplikace.

## Rozhodnutí

**Phase 1–7:** In-memory synchronní event bus (`core/events/bus.ts`). Jednoduchý, bez infrastruktury, dostatečný pro synchronní subscribers v rámci jednoho requestu.

**Phase 8:** Výměna za **pg-boss + outbox pattern**. Event row se zapíše ve stejné transakci jako business write (business + event = atomic). Dedikovaný worker drainuje frontu.

## Alternativy odmítnuty

- **Redis + Bull/BullMQ:** Přidává Redis jako separátní infrastrukturní komponentu. Zbytečné, když pg-boss řeší totéž přes existující PostgreSQL.
- **Kafka/RabbitMQ:** Over-engineering pro 5–30 zaměstnanců a jednu databázi.
- **Webhooks:** Vhodné pro cross-service komunikaci, ale zde jsou oba moduly v jednom procesu.

## Důsledky

Phase 1–7: event loss je možný při pádu serveru (in-memory). Akceptovatelné pro dev/test fáze.  
Phase 8+: at-least-once delivery. Subscribers musí být idempotentní.
