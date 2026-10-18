import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { AppError } from "@/lib/errors/app-error";
import * as schema from "./schema";

export const FASTFOOD_SCHEMA = "fastfood_app";

/**
 * Resolves the runtime database connection URL (`DATABASE_URL` only).
 * Never reads or falls back to `MIGRATION_DATABASE_URL`.
 */
export function resolveRuntimeDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const url = env.DATABASE_URL?.trim();
  return url && url.length > 0 ? url : null;
}

/**
 * Returns true only when an explicit DATABASE_URL environment variable is provided.
 * Prevents silent fallback to a non-existent localhost database when running unit tests,
 * while guaranteeing that configured deployments execute against PostgreSQL.
 */
export function isDatabaseConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return resolveRuntimeDatabaseUrl(env) !== null;
}

/**
 * Enforces fail-closed database persistence in production.
 * In production (NODE_ENV=production), missing DATABASE_URL must NEVER silently fall back
 * to volatile in-memory stores or to MIGRATION_DATABASE_URL.
 */
export function assertDatabaseReadyForRuntime(
  env: NodeJS.ProcessEnv = process.env
): void {
  const isBuildPhase = env.NEXT_PHASE === "phase-production-build";
  if (env.NODE_ENV === "production" && !isBuildPhase && !isDatabaseConfigured(env)) {
    throw new AppError(
      "CONFIG_ERROR",
      "Production runtime requires DATABASE_URL to be configured. In-memory fallback is strictly disabled in production.",
      503
    );
  }
}

const connectionString =
  resolveRuntimeDatabaseUrl(process.env) ||
  "postgres://postgres:postgres@localhost:5432/fast_food";

export const pool = new Pool({
  connectionString,
  max: 10, // Sized conservatively for shared Supabase Supavisor Session Pooler
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Defense-in-depth: lock every pooled connection's search_path to fastfood_app
pool.on("connect", (client) => {
  client.query(`SET search_path TO ${FASTFOOD_SCHEMA}`).catch(() => {
    // Handled by query-level qualification in schema.ts
  });
});

export const db = drizzle(pool, { schema });
export { schema };

/**
 * Verifies live PostgreSQL connectivity and active schema resolution without leaking credentials.
 */
export async function verifyDatabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  activeSchema: string | null;
  error?: string;
}> {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      activeSchema: null,
      error: "DATABASE_URL is not configured in environment.",
    };
  }

  let client;
  try {
    client = await pool.connect();
    await client.query(`SET search_path TO ${FASTFOOD_SCHEMA}`);
    const res = await client.query<{ current_schema: string }>(
      "SELECT current_schema() AS current_schema"
    );
    const activeSchema = res.rows[0]?.current_schema ?? null;
    return {
      configured: true,
      connected: true,
      activeSchema,
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      activeSchema: null,
      error: err?.message ? "Database connection check failed" : "Unknown database error",
    };
  } finally {
    if (client) client.release();
  }
}

