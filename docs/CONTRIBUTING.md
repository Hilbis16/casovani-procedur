# Contributing

## Dev setup

```bash
# Prerekvizity: Node 22 LTS, Docker Desktop (WSL2 backend), Git
git clone <repo>
cd časování_procedur
cp .env.example .env
# Upravit DATABASE_URL v .env
docker compose -f deploy/dev/docker-compose.yml up -d
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

## Branch policy

- `main` — produkce, chráněná větev, vyžaduje PR
- `feature/phase-N-*` — práce na konkrétní fázi
- `fix/*` — bugfixy

## Pre-commit

Husky + lint-staged spustí ESLint a Prettier automaticky před každým commitem.

```bash
npm run lint        # ESLint check
npm run format      # Prettier fix
npm run typecheck   # TypeScript check
npm test            # Vitest
```

## Commit messages

Formát: `type: stručný popis` (česky nebo anglicky)

```
feat: přidat kontrolu dostupnosti terapeuta
fix: opravit přetékání WeeklyGrid na mobilech
chore: upgradovat Prisma na 6.x
docs: doplnit ARCHITECTURE.md
```

## Pull requests

1. Jeden PR = jedna logická změna
2. Popis: co, proč, jak testovat
3. Projde: lint + typecheck + tests + build v CI
4. Code review před merge (self-review pokud solo)

## Přidávání nových modulů

1. Vytvořit `src/modules/<nazev>/` se strukturou: `actions/`, `components/`, `schemas/`, `lib/`
2. Přidat pravidlo do `no-restricted-imports` v `eslint.config.mjs`
3. Exportovat veřejné kontrakty přes `src/modules/core/contracts/`
4. Zdokumentovat v `docs/ARCHITECTURE.md`
