#!/usr/bin/env bash
#
# Daily Postgres backup for a single-VM Proxima deployment. Dumps the database
# out of the running `db` container, gzips it, and keeps the most recent N.
#
# Paths are derived from this script's location, so it works from any clone.
# Override the defaults with env vars if you like:
#   BACKUP_DIR   where dumps are written   (default: $HOME/proxima-backups)
#   KEEP         how many to retain        (default: 14)
#
# Install as a daily 03:30 cron (run once, from the repo root):
#   ( crontab -l 2>/dev/null | grep -v 'deploy/backup.sh'; \
#     echo "30 3 * * * $(pwd)/deploy/backup.sh >> \$HOME/proxima-backups/backup.log 2>&1" ) | crontab -
#
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/proxima-backups}"
KEEP="${KEEP:-14}"

COMPOSE="sudo docker compose -f $REPO/docker-compose.prod.yml -f $REPO/deploy/docker-compose.deploy.yml"

mkdir -p "$BACKUP_DIR"

# Read the DB credentials from the same .env the stack runs with.
PW="$(grep -m1 '^POSTGRES_PASSWORD=' "$REPO/.env" | cut -d= -f2-)"
USER="$(grep -m1 '^POSTGRES_USER=' "$REPO/.env" | cut -d= -f2-)"; USER="${USER:-proxima}"
DB="$(grep -m1 '^POSTGRES_DB=' "$REPO/.env" | cut -d= -f2-)"; DB="${DB:-proxima}"

TS="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/proxima_${TS}.sql.gz"

if $COMPOSE exec -T -e PGPASSWORD="$PW" db pg_dump -U "$USER" -d "$DB" | gzip > "$FILE"; then
  # Prune all but the newest $KEEP dumps.
  ls -1t "$BACKUP_DIR"/proxima_*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
  KEPT="$(ls -1 "$BACKUP_DIR"/proxima_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')"
  echo "$(date -Is) OK   $FILE ($(du -h "$FILE" | cut -f1)) [$KEPT kept]"
else
  rm -f "$FILE"
  echo "$(date -Is) FAIL backup did not complete"
  exit 1
fi
