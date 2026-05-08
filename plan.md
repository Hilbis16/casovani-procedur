# Stav projektu – živý tracker

Poslední aktualizace: 2026-05-08

Podrobná architektura a roadmapa: `C:\Users\HP-David\.claude\plans\hlavn-pot-ebuji-ud-lat-d-kladnou-sleepy-origami.md`  
Akční checklist s tickboxy: `ToDO.md`

---

## Aktuální stav

**Branch:** `feature/phase-0-foundation`  
**Poslední tag:** `v0.2.1`  
**DB:** PostgreSQL 16 v Dockeru (port 5435) — běží, seed OK  
**CI:** GitHub Actions workflow připraven (`.github/workflows/ci.yml`)

### Co funguje

- Celý MVP — plánování, týdenní grid, recurring procedury, conflict detection
- ESLint + Prettier + Husky (pre-commit hook)
- Vitest — 9/9 testů (conflictDetection.ts)
- `npm run lint` ✅ | `npm test` ✅ | `npm run build` ✅
- `docs/` skeleton — 7 dokumentů + 8 ADR
- PostgreSQL dev stack (`docker compose -f deploy/dev/docker-compose.yml up -d`)

### Dev prostředí — spuštění

```bash
docker compose -f deploy/dev/docker-compose.yml up -d   # Postgres :5435 + Adminer :8080
npm run dev                                              # App → http://localhost:3002
```

---

## In progress

Nic — Phase 0 uzavřena.

---

## Next up → Phase 1 — Auth + audit + headers

**Větev:** vytvořit `feature/phase-1-auth`  
**Cíl:** žádný endpoint veřejný, každý write auditovaný.

Klíčové kroky (detail v `ToDO.md`):

1. Wave A migrace: `Facility`, `User`, `Role`, `Permission`, `UserRole`, `Session`, `AuditLog`
2. Auth.js v5 — email + heslo, argon2id, `/prihlaseni`, `/zapomenute-heslo`
3. `withAudit()` wrapper na všech server actions
4. Postgres trigger: AuditLog append-only
5. Security headers (CSP nonce, HSTS, X-Frame-Options) v `next.config.ts`
6. `src/middleware.ts` — auth gate pro všechny routes kromě `/prihlaseni`, `/api/health`
7. Seed OPERATOR + FACILITY_ADMIN uživatelé z env vars
8. `/api/health` veřejný endpoint
9. CHANGELOG `[0.3.0]`, tag `v0.3.0`

**DoD:** přístup na `/planovani` bez session → redirect na `/prihlaseni`; write server action → řádek v `AuditLog`; `UPDATE "AuditLog" ...` v psql selže (trigger).

---

## Backlog (stručně)

| Phase | Co                                                                                     | Status     |
| ----- | -------------------------------------------------------------------------------------- | ---------- |
| 2     | RBAC (admin/lekar/terapeut/recepcni/auditor) + break-glass mechanismus                 | Nespuštěno |
| 3     | Schema Wave B: Stay, Room, Building, soft-delete, indexy, conflict detection rozšíření | Nespuštěno |
| 4     | Refactor do `src/modules/{core,scheduling}` struktury                                  | Nespuštěno |
| 5     | Field-level encryption (Patient.note, birthNumber, Schedule.note)                      | Nespuštěno |
| 6     | GDPR UX (SAR, anonymizace, privacy policy, consent)                                    | Nespuštěno |
| 7     | Hotel modul skeleton                                                                   | Nespuštěno |
| 8     | Production hardening (rate limiting, pg-boss, pgBackRest, health)                      | Nespuštěno |
| 9     | Deployment templates (docker-compose.prod, Caddy, INSTALL.md)                          | Nespuštěno |
| 10    | Fleet management console + Operator handbook                                           | Nespuštěno |

---

## Otevřené technické otázky

1. **Prisma 7** — breaking change (`url` v schema přesunuto do `prisma.config.ts`). Migrovat v Phase 3 nebo Phase 4 (zároveň s refactorem). Nepřepínat v Phase 1 — zbytečný risk.
2. **Playwright** — odloženo z Phase 0 do Phase 1 (e2e testy potřebují přihlašovací flow).
3. **`OPERATOR_HANDBOOK.md`** — napsat v Phase 2 (break-glass procedury, fleet management).
4. **`SMLOUVA_O_ZPRACOVANI.md`** — DPA template, napsat v Phase 6.
5. **`docs/adr/0009-no-supabase.md`** a **`0010-operator-controller-separation.md`** — přidat v Phase 1 resp. Phase 2.

---

## Původní MVP audit (plan.md ze dne 2026-04-30)

Problémy z MVP auditu a jejich řešení v roadmapě:

| #   | Problém                                        | Řeší                                |
| --- | ---------------------------------------------- | ----------------------------------- |
| 1   | Chybí autentizace                              | Phase 1                             |
| 2   | Dostupnost terapeutů se nekontroluje           | Phase 3                             |
| 3   | Chybí stránky terapeuta `/terapeuti/[id]`      | Phase 1 (součást scaffoldu)         |
| 4   | `procedury/[id]/upravit` architekturální chyba | Phase 4 (refactor)                  |
| 5   | Stav procedury nelze měnit z UI                | Phase 3 (AppointmentForm rozšíření) |
| 6   | Redundantní `/pacienti/[id]`                   | Phase 3                             |
| 7   | WeeklyGrid není responzivní                    | Phase 3                             |
| 8   | Chybí toast notifikace                         | Phase 1 (přidat při auth)           |
| 9   | Export není implementován                      | Phase 6 (SAR) / Phase 8 (PDF)       |
| 10  | Opakující se procedury nelze editovat          | Phase 3                             |
| 11  | Prázdný stav `/prehled`                        | Phase 3                             |
| 12  | Validace dat pobytu (checkin > checkout)       | Phase 3 (Wave B Stay model)         |
