# Instalace

Průvodce nasazením u klienta. Předpoklady: VPS/server s Docker Engine + Compose V2, doménové jméno s DNS.

## 1. Stažení aplikace

```bash
git clone https://github.com/your-org/lazenska-app /opt/lazenska
cd /opt/lazenska
```

## 2. Konfigurace

```bash
cp deploy/.env.example deploy/.env
```

Povinné proměnné k vyplnění:

- `DATABASE_URL` — PostgreSQL connection string (generuje Compose)
- `AUTH_SECRET` — `openssl rand -base64 32`
- `NEXTAUTH_URL` — veřejná URL aplikace (např. `https://procedury.klinika.cz`)
- `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` — první admin účet

## 3. Spuštění

```bash
docker compose -f deploy/docker-compose.prod.yml up -d
```

Compose spustí: PostgreSQL, aplikaci Next.js, Caddy (TLS reverse proxy).

## 4. První start

Při prvním spuštění seed skript automaticky:

- Aplikuje Prisma migrace
- Vytvoří Facility záznam
- Vytvoří admin účet (z `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`)
- Vytvoří výchozí role (admin, lekar, terapeut, recepcni, auditor)

Přihlaste se na `https://vase-domena/prihlaseni`.

## 5. Ověření

```bash
curl https://vase-domena/api/health
# → {"db":"ok","queue":"ok","storage":"ok"}
```

## 6. Zálohy

Nakonfigurovat pgBackRest offsite cíl v `deploy/backup/pgbackrest.conf` a spustit první full backup:

```bash
docker compose exec app pgbackrest --stanza=lazenska backup --type=full
```

## Upgrade

```bash
git pull
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d --no-deps app
```

Migrace se aplikují automaticky při startu app kontejneru.
