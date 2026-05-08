# ADR 0003 — Auth.js v5 pro autentizaci

**Status:** Accepted  
**Datum:** 2026-05-08

## Kontext

Aplikace nemá autentizaci. Pro zdravotnictví je vyžadována: DB sessions, password hashing (argon2id), email verify, password reset, RBAC základ.

## Rozhodnutí

Auth.js v5 (NextAuth v5) s vlastním Prisma adaptérem, email + heslo + magic link.

## Alternativy odmítnuty

- **Lucia Auth:** Sunset. Autor ukončil vývoj v říjnu 2024.
- **NextAuth v4:** Breaking changes v v5 jsou additivní (nový config formát); v4 není aktivně maintainována pro Next.js App Router.
- **Custom JWT:** Implementace argon2id, session management, CSRF a revocation from scratch = zbytečné bezpečnostní riziko.
- **Clerk/Auth0:** SaaS — data opouštějí klientovu infrastrukturu. Nevyhovuje self-hosted požadavku.

## Důsledky

Vlastní `/prihlaseni`, `/odhlaseni`, `/zapomenute-heslo` stránky (česky). Session v PostgreSQL tabulce `sessions` s HttpOnly + Secure cookies.
