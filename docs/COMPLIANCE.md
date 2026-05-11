# Compliance

## GDPR + Czech law mapping

| Kontrola                         | Regulace                           | Implementace                                              | Status  |
| -------------------------------- | ---------------------------------- | --------------------------------------------------------- | ------- |
| Autentizace & session management | GDPR Art. 32, §16 Vyhl. 98/2012    | Auth.js v5, argon2id, 12h sliding session                 | Phase 1 |
| Auditní log                      | §53 Z. 372/2011, GDPR Art. 30      | AuditLog model, withAudit() wrapper, append-only trigger  | Phase 1 |
| RBAC (need-to-know)              | §27 Z. 372/2011                    | Roles: admin/lekar/terapeut/recepcni/auditor              | Phase 2 |
| Šifrování PII at-rest            | GDPR Art. 32(1)(a), §5 Z. 110/2019 | prisma-field-encryption AES-256-GCM pro note, birthNumber | Phase 5 |
| TLS in-transit                   | GDPR Art. 32                       | Caddy auto-cert, HSTS preload                             | Phase 9 |
| Souhlas subjektu                 | GDPR Art. 6, 7                     | Patient.consents JSONB                                    | Skipped |
| Právo na přístup (SAR)           | GDPR Art. 15                       | /spravce/pacienti/[id]/export                             | Phase 6 |
| Právo na výmaz                   | GDPR Art. 17                       | Anonymizace (ne smazání — audit zachován)                 | Phase 6 |
| Retention & purge                | Vyhl. 98/2012 §3                   | pg-boss nightly worker                                    | Phase 8 |
| Privacy policy                   | GDPR Art. 13                       | /zasady-ochrany-osobnich-udaju                            | Phase 6 |
| DPIA                             | GDPR Art. 35                       | docs/DPIA.md                                              | Phase 6 |
| DPO kontakt                      | GDPR Art. 37                       | Patička aplikace                                          | Phase 6 |
| Záznam o zpracování              | GDPR Art. 30                       | Tato tabulka + audit log                                  | Phase 1 |

## Retention schedule

| Data                          | Retence                  | Základ          | Akce po uplynutí      |
| ----------------------------- | ------------------------ | --------------- | --------------------- |
| AuditLog                      | 10 let                   | §53 Z. 372/2011 | Purge (pg-boss)       |
| ProcedureSchedule (completed) | 5 let od ukončení pobytu | Vyhl. 98/2012   | Anonymizace           |
| Stay (cancelled)              | 5 let                    | Vyhl. 98/2012   | Anonymizace           |
| Patient (aktivní)             | Po dobu pobytu + 5 let   | Vyhl. 98/2012   | Anonymizace na žádost |
| Session                       | 12 hodin (sliding)       | GDPR Art. 32    | Auto-expiry           |

## Sub-processors

| Procesor            | Účel                        | Umístění dat          | DPA                 |
| ------------------- | --------------------------- | --------------------- | ------------------- |
| Klientův VPS/server | Hosting aplikace a databáze | U klienta             | Součást instalace   |
| pgBackRest target   | Zálohy DB                   | Klient určí (offsite) | Odpovědnost klienta |

Data **nikdy** neopouští klientovu infrastrukturu — žádný SaaS, žádný cloud DB.

## GDPR role

- **Správce dat (Controller):** Provozovatel zdravotnického zařízení (facility admin)
- **Zpracovatel dat (Processor):** David Hilbert (system operator)
- **Smluvní základ:** Smlouva o zpracování dle GDPR Art. 28 (viz `docs/templates/SMLOUVA_O_ZPRACOVANI.md`)
