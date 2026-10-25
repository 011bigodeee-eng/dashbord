import "dotenv/config";
import { databaseIntegrationEnabled } from "../runtime.config.mjs";
import { spawnSync } from "node:child_process";
function run(script) {
  const result = spawnSync("npm", ["run", script], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (databaseIntegrationEnabled && process.env.APP_MODE === "database")
  run("db:migrate");
else
  console.log(
    "MD Nation: modo temporário sem banco. Migrações e serviços externos não serão executados.",
  );
run("build");
