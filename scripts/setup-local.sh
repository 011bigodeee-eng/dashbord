#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  node --input-type=module -e '
    import { randomBytes } from "node:crypto";
    import { writeFileSync } from "node:fs";
    writeFileSync(".env", "DATABASE_URL=postgresql://pulse:pulse_local_dev@127.0.0.1:5432/pulse\nAUTH_SECRET=" + randomBytes(48).toString("hex") + "\nDEMO_MODE=true\nNEXT_PUBLIC_DEMO_MODE=true\n", {flag:"wx",mode:0o600});
  '
fi
npm ci --cache "${PULSE_NPM_CACHE:-/tmp/pulse-npm-cache}"
bash scripts/local-db.sh
npx prisma generate
npm run db:migrate
# Seed is explicitly opt-in; production and demo must use separate databases.
if grep -qx 'DEMO_MODE=true' .env; then npm run db:seed; fi
