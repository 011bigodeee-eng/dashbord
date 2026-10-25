#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if docker container inspect pulse-postgres >/dev/null 2>&1; then
  docker start pulse-postgres >/dev/null
else
  docker volume create pulse-pgdata >/dev/null
  docker run --name pulse-postgres \
    -e POSTGRES_USER=pulse -e POSTGRES_PASSWORD=pulse_local_dev -e POSTGRES_DB=pulse \
    -p 127.0.0.1:5432:5432 -v pulse-pgdata:/var/lib/postgresql/data \
    -d postgres:17-alpine >/dev/null
fi
for attempt in {1..30}; do
  if docker exec pulse-postgres pg_isready -U pulse -d pulse >/dev/null 2>&1; then
    if [ -f .local/cloud-snapshot.sql ] && ! docker exec pulse-postgres psql -U pulse -d pulse -Atc "SELECT to_regclass('public.users')" | rg -q '^users$'; then
      docker exec -i pulse-postgres psql -v ON_ERROR_STOP=1 -U pulse -d pulse < .local/cloud-snapshot.sql
    fi
    echo 'PostgreSQL local disponível.'
    exit 0
  fi
  sleep 1
done
echo 'PostgreSQL não ficou disponível no tempo esperado.' >&2
exit 1
