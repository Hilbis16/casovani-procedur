# ADR 0005 — App-layer envelope encryption pro PII

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

GDPR Art. 32(1)(a) a §5 Z. 110/2019 vyžadují šifrování osobních údajů at-rest. Šifrovaná pole: `Patient.note`, `Patient.birthNumber`, `ProcedureSchedule.note`.

## Rozhodnutí

`prisma-field-encryption` (AES-256-GCM, app-layer). Klíč v `ENCRYPTION_KEY` env proměnné. Re-encrypt skript při rotaci klíče.

## Alternativy odmítnuty

- **pgcrypto (DB-layer):** Šifrovací klíč musí být dostupný PostgreSQL procesu — při úniku DB dumpu i klíče je data kompromitována. App-layer encryption odděluje klíč od dat.
- **Šifrování celého disku (LUKS/BitLocker):** Chrání fyzický přístup, ale ne přístup přes napadený DB server. Komplementární, ale nestačí samotné.
- **Transparentní DB šifrování (TDE):** PostgreSQL CE nemá TDE; komerční řešení jsou out of scope pro self-hosted.

## Důsledky

Šifrovaná pole nejsou prohledatelná přes `LIKE` nebo `=` SQL operátory. Full-text search na zašifrovaných polích není možný. Omezení přijatelné — poznámky nejsou kriticky prohledávané.
