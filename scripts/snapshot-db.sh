#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! node --input-type=module -e 'import "dotenv/config"; process.exit(process.env.APP_MODE === "database" ? 0 : 1)'; then
  echo 'Modo temporário: nenhum snapshot do banco foi criado ou alterado.'
  exit 0
fi
mkdir -p .local
umask 077
docker exec pulse-postgres pg_dump -U pulse -d pulse --no-owner --no-acl > .local/cloud-snapshot.sql.tmp
mv .local/cloud-snapshot.sql.tmp .local/cloud-snapshot.sql
echo 'Snapshot local salvo em .local/cloud-snapshot.sql (ignorado pelo Git).'
