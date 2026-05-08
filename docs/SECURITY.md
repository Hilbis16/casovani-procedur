# Security

## Threat model (STRIDE)

| Hrozba                                          | Aktéři                            | Mitigace                                                                      | Status  |
| ----------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------- | ------- |
| **Spoofing** — neoprávněný přístup k systému    | Útočník v síti                    | Auth.js v5, argon2id, HttpOnly session cookies, email verify                  | Phase 1 |
| **Tampering** — změna dat bez záznamu           | Zlomyslný uživatel, SQL injection | Audit log append-only (Postgres trigger), Prisma ORM (parametrizované dotazy) | Phase 1 |
| **Repudiation** — popření akce                  | Personál                          | Audit log s actorId, IP, timestamp, before/after                              | Phase 1 |
| **Information disclosure** — únik PII           | Útočník s přístupem k DB dumpu    | AES-256-GCM field encryption pro note, birthNumber; TLS in transit            | Phase 5 |
| **Denial of Service** — zahlcení API            | Boti, brute-force                 | Rate limiting na /api/auth/\* a write actions (rate-limiter-flexible)         | Phase 8 |
| **Elevation of privilege** — získání admin práv | Autentizovaný uživatel            | RBAC can() helper na každé server action; session revocation                  | Phase 2 |

## Security headers

Implementováno v Phase 1 (`next.config.ts` + `middleware.ts`):

- `Content-Security-Policy` (s nonce pro inline scripts)
- `Strict-Transport-Security` (HSTS, max-age=31536000, includeSubDomains)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Vulnerability reporting

Bezpečnostní chyby hlaste na: hilbertdavid16@gmail.com (David Hilbert, system operator)

Nehlaste veřejně přes GitHub Issues — počkejte na potvrzení a koordinovanou disclosure.

## Incident response (GDPR Art. 33)

Při úniku dat obsahujících PII:

1. Identifikovat rozsah — jaká data, kolik subjektů, jak dlouho
2. Izolovat zranitelnost (revoke sessions, odpojit DB pokud nutné)
3. Do **72 hodin** notifikovat ÚOOÚ (uoou.cz) a dotčené správce (facility admins)
4. Dokumentovat v `docs/incidents/YYYY-MM-DD.md`
5. Post-mortem do 30 dní

Viz `docs/RUNBOOK.md#incident-response` pro operační kroky.
