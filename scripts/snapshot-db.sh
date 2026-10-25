#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
umask 077
docker exec pulse-postgres pg_dump -U pulse -d pulse --no-owner --no-acl > .local/cloud-snapshot.sql.tmp
mv .local/cloud-snapshot.sql.tmp .local/cloud-snapshot.sql
echo 'Snapshot local salvo em .local/cloud-snapshot.sql (ignorado pelo Git).'
