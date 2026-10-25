import { isStandaloneMode } from "./runtime-mode";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDB = globalThis as unknown as { db?: PrismaClient };
export const db: PrismaClient = isStandaloneMode()
  ? new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "O banco está desativado no modo temporário. Configure APP_MODE=database para reconectar.",
        );
      },
    })
  : (globalDB.db ??
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    }));
if (!isStandaloneMode() && process.env.NODE_ENV !== "production")
  globalDB.db = db;
