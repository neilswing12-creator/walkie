// Switches the project to PostgreSQL (production): provider → postgresql and the Postgres migration history
// (prisma/migrations-postgres) becomes prisma/migrations. Idempotent. Then: set DATABASE_URL and run `npx prisma migrate deploy`.
// New schema changes for Postgres: `npx prisma migrate dev --name <change>` against a Postgres dev DB.
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
const root = new URL("../prisma/", import.meta.url);
const f = new URL("schema.prisma", root);
writeFileSync(f, readFileSync(f, "utf8").replace(/provider = "sqlite"/, 'provider = "postgresql"'));
const lock = new URL("migrations/migration_lock.toml", root);
const isSqlite = existsSync(lock) && readFileSync(lock, "utf8").includes("sqlite");
if (isSqlite && existsSync(new URL("migrations-postgres", root))) {
  renameSync(new URL("migrations", root), new URL("migrations-sqlite", root));
  renameSync(new URL("migrations-postgres", root), new URL("migrations", root));
}
console.log("Using PostgreSQL. Next: DATABASE_URL=postgresql://… then `npx prisma migrate deploy && npm run db:seed`.");
