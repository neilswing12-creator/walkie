import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Local SQLite only: WAL + a busy timeout let concurrent requests queue instead of failing (PostgreSQL needs nothing here).
if ((process.env.DATABASE_URL ?? "").startsWith("file:") && !(globalThis as { __walkieWal?: boolean }).__walkieWal) {
  (globalThis as { __walkieWal?: boolean }).__walkieWal = true;
  db.$queryRawUnsafe("PRAGMA journal_mode=WAL").then(() => db.$queryRawUnsafe("PRAGMA busy_timeout=8000")).catch(() => {});
}

export type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
