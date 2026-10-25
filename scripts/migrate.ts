import "dotenv/config";
import { Pool } from "pg";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext('pulse-migrations'))",
  );
  await client.query(
    'CREATE TABLE IF NOT EXISTS "_pulse_migrations" (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  for (const name of (
    await readdir("prisma/migrations", { withFileTypes: true })
  )
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()) {
    const sql = await readFile(
      `prisma/migrations/${name}/migration.sql`,
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      'SELECT checksum FROM "_pulse_migrations" WHERE name=$1',
      [name],
    );
    if (previous.rows.length) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error(`Migration alterada após aplicação: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      'INSERT INTO "_pulse_migrations" (name,checksum) VALUES ($1,$2)',
      [name, checksum],
    );
    console.log(`Aplicada: ${name}`);
  }
  await client.query("COMMIT");
  console.log("Banco atualizado.");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await pool.end();
}
