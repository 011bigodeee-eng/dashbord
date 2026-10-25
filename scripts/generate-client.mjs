import { spawnSync } from "node:child_process";
// Generating types does not query a database. Supply a non-secret placeholder
// only to this subprocess so missing/empty deployment variables cannot block it.
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "generate"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://generated-client@127.0.0.1:1/not-used",
    },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
