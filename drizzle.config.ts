import { defineConfig } from "drizzle-kit";

const DB_CONNECTION_COMMANDS = new Set([
  "migrate",
  "push",
  "pull",
  "introspect",
  "studio",
]);

/**
 * Resolves and validates the dedicated migration connection string (`MIGRATION_DATABASE_URL`).
 * Never falls back to `DATABASE_URL` (which belongs to the least-privilege `fastfood_runtime_role`).
 */
export function resolveMigrationDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string {
  const url = env.MIGRATION_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "MIGRATION_DATABASE_URL is required for Drizzle migration/schema commands (must connect as fastfood_migrator_role). Refusing to fall back to runtime DATABASE_URL."
    );
  }
  return url;
}

const isDbConnectionCommand = process.argv.some((arg) =>
  DB_CONNECTION_COMMANDS.has(arg)
);
if (isDbConnectionCommand) {
  resolveMigrationDatabaseUrl(process.env);
}

/**
 * Drizzle Kit Configuration — Scoped strictly to `fastfood_app` schema.
 * Note: `schemaFilter` scopes introspection/push only; table-level `pgSchema("fastfood_app")`
 * in `src/lib/db/schema.ts` is the authoritative DDL scoping mechanism for generated migrations.
 * Always inspect generated SQL in `./drizzle` before applying.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["fastfood_app"],
  migrations: {
    schema: "fastfood_app",
    table: "__drizzle_migrations",
  },
  dbCredentials: {
    get url(): string {
      return resolveMigrationDatabaseUrl(process.env);
    },
  },
  verbose: true,
  strict: true,
});

