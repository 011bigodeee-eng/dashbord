import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";
// WASM schema engine avoids platform-specific binary downloads in cloud tasks.
export default defineConfig({
  schema: "prisma/schema.prisma",
  experimental: { adapter: true },
  engine: "js",
  adapter: async () => new PrismaPg({ connectionString: env("DATABASE_URL") }),
});
