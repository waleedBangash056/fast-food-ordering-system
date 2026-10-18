import { desc } from "drizzle-orm";
import { assertDatabaseReadyForRuntime, db, isDatabaseConfigured } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export interface AuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export class AuditService {
  private events: AuditRecord[] = [
    {
      id: "aud-001",
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      actorId: "usr-staff-1",
      actorRole: "STAFF",
      action: "ORDER_STATUS_UPDATE",
      entityType: "ORDER",
      entityId: "ord-test-101",
      details: "Transitioned status from CONFIRMED to PREPARING",
    },
    {
      id: "aud-002",
      timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      actorId: "sys-stripe",
      actorRole: "SYSTEM_PAYMENT_WEBHOOK",
      action: "PAYMENT_CAPTURED",
      entityType: "PAYMENT_INTENT",
      entityId: "pi_demo_88231",
      details: "Amount $36.36 captured via Stripe webhook",
    },
    {
      id: "aud-003",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actorId: "usr-admin-1",
      actorRole: "BRANCH_MANAGER",
      action: "BRANCH_CAPACITY_OVERRIDE",
      entityType: "BRANCH",
      entityId: "branch-1",
      details: "Max concurrent orders threshold adjusted to 45",
    },
  ];

  async recordAuditEvent(event: {
    actorId: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string;
    ipAddress?: string;
  }): Promise<AuditRecord> {
    assertDatabaseReadyForRuntime();

    const record: AuditRecord = {
      id: "aud-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actorId: event.actorId,
      actorRole: event.actorRole,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      details: event.details,
      ipAddress: event.ipAddress,
    };

    if (isDatabaseConfigured()) {
      await db.insert(auditLogs).values({
        id: record.id,
        actorId: record.actorId,
        actorRole: record.actorRole,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        details: record.details,
        ipAddress: record.ipAddress || null,
        createdAt: new Date(record.timestamp),
      });
      return record;
    }

    this.events.unshift(record);
    return record;
  }

  getAuditEvents(): AuditRecord[] {
    assertDatabaseReadyForRuntime();
    return [...this.events];
  }

  async getAuditEventsAsync(): Promise<AuditRecord[]> {
    assertDatabaseReadyForRuntime();

    if (!isDatabaseConfigured()) {
      return [...this.events];
    }

    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(200);

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.createdAt.toISOString(),
      actorId: row.actorId || "system",
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      details: row.details || "",
      ipAddress: row.ipAddress || undefined,
    }));
  }
}

export const auditService = new AuditService();