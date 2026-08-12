# Runbook

Operační příručka pro běžné úkony, zálohy, obnovu a incidenty.

---

## 1. Spuštění dev prostředí

```bash
# Spustit PostgreSQL + Adminer
docker compose -f deploy/dev/docker-compose.yml up -d

# Nainstalovat závislosti
npm install

# Aplikovat migrace + seed
npx prisma migrate dev
npm run seed

# Spustit Next.js dev server
npm run dev
# → http://localhost:3002
```

---

## 2. Produkční nasazení

Viz `docs/INSTALL.md` pro kompletní instalační průvodce.

```bash
# První nasazení
cp deploy/.env.example deploy/.env
# Upravit .env dle potřeby
docker compose -f deploy/docker-compose.prod.yml up -d

# Upgrade (plánované okno)
docker compose -f deploy/docker-compose.prod.yml pull
docker compose -f deploy/docker-compose.prod.yml up -d --no-deps app
```

---

## 3. Zálohování (pgBackRest)

```bash
# Manuální full backup
pgbackrest --stanza=lazenska backup --type=full

# Ověření zálohy
pgbackrest --stanza=lazenska info

# Restore drill (na testovací instanci!)
pgbackrest --stanza=lazenska restore --pg1-path=/var/lib/postgresql/data --delta
```

Automatické zálohy: nightly full, každé 6h incremental (konfigurace viz `deploy/backup/pgbackrest.conf`).

---

## 4. Rotace šifrovacího klíče (ENCRYPTION_KEY)

```bash
# 1. Vygenerovat nový klíč
openssl rand -base64 32

# 2. Spustit re-encryption skript (zachovává starý klíč pro dekrypci)
npm run reencrypt -- --old-key=OLD --new-key=NEW

# 3. Aktualizovat .env na nový klíč
# 4. Restartovat aplikaci
```

⚠ Bez re-encryption skriptu budou stará šifrovaná data nečitelná.

---

## 5. Revokace session

```sql
-- Revokovat všechny session konkrétního uživatele
UPDATE sessions SET "revokedAt" = now() WHERE "userId" = 'user_id_here';
```

---

## 6. Incident response

1. **Identifikovat rozsah:** `SELECT * FROM "AuditLog" WHERE "occurredAt" > now() - interval '24 hours' ORDER BY "occurredAt" DESC;`
2. **Izolovat:** zastavit app container (`docker compose stop app`)
3. **Notifikovat:** ÚOOÚ do 72 hodin (uoou.cz), dotčení facility admins
4. **Dokumentovat:** vytvořit `docs/incidents/YYYY-MM-DD.md`
5. **Post-mortem:** do 30 dní

---

## 7. Restore drill (měsíčně)

1. Spustit čistou testovací instanci PostgreSQL
2. `pgbackrest restore` na testovací instanci
3. Spustit aplikaci s testovací DB
4. Spustit: `curl http://test-instance/api/health`
5. Ručně ověřit: login, vytvoření pacienta, plánování procedury
6. Zaznamenat výsledek do `docs/incidents/drill-YYYY-MM.md`

---

## 8. Auto-close stale schedules (v0.10+)

Endpoint `POST /api/cron/auto-close-schedules` přepne všechny `ProcedureSchedule` se stavem `planned` a datem v minulosti na `completed`. Audit log dostane záznam `cron.auto_close_schedules` s počtem aktualizovaných řádků.

**Konfigurace:**

```bash
# 1. Vygenerovat tajný klíč
openssl rand -base64 32

# 2. Vložit do .env / deploy/.env
CRON_SECRET=<vygenerovaný-klíč>
```

**Spouštění — Linux crontab** (denně 23:00):

```cron
0 23 * * * curl -sS -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3002/api/cron/auto-close-schedules >> /var/log/lazenska-cron.log 2>&1
```

**Spouštění — Windows Task Scheduler:**

```powershell
# Vytvoření úlohy (jednorázově, jako Admin)
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -Command "Invoke-WebRequest -Method POST -Headers @{\"x-cron-secret\"=$env:CRON_SECRET} -Uri http://localhost:3002/api/cron/auto-close-schedules"'
$trigger = New-ScheduledTaskTrigger -Daily -At 23:00
Register-ScheduledTask -TaskName 'lazenska-auto-close' -Action $action -Trigger $trigger -RunLevel Highest
```

**Ruční spuštění (test / one-shot):**

```bash
curl -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3002/api/cron/auto-close-schedules
# → {"success":true,"updated":N}
```

**Návratové kódy:**

- `200` — úspěch, vrátí `{ success, updated }`
- `401` — chybný nebo chybějící `x-cron-secret` header
- `500` — `CRON_SECRET` není nastaven v ENV

**Phase 9 plán:** přepnout na pg-boss queue handler beze změny veřejné API smlouvy.
