#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  (umask 077; printf '%s\n' 'APP_MODE=standalone' > .env)
fi
npm ci --cache "${PULSE_NPM_CACHE:-/tmp/pulse-npm-cache}"
npx prisma generate
if node --input-type=module -e 'import "dotenv/config"; process.exit(process.env.APP_MODE === "database" ? 0 : 1)'; then
  bash scripts/local-db.sh
  npm run db:migrate
  if grep -qx 'DEMO_MODE=true' .env; then npm run db:seed; fi
else
  echo 'MD Nation: demonstração local pronta, sem banco, credenciais ou Docker.'
fi
