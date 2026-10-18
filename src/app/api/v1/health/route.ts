import { NextResponse } from "next/server";
import { FASTFOOD_SCHEMA, verifyDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbHealth = await verifyDatabaseHealth();

  const isHealthy = dbHealth.configured ? dbHealth.connected : process.env.NODE_ENV !== "production";
  const statusCode = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      service: "smash-and-sizzle-web",
      targetSchema: FASTFOOD_SCHEMA,
      database: {
        configured: dbHealth.configured,
        connected: dbHealth.connected,
        activeSchema: dbHealth.activeSchema,
        persistenceMode: dbHealth.configured ? "postgresql" : "in-memory-fallback",
        ...(dbHealth.error ? { notice: dbHealth.error } : {}),
      },
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
