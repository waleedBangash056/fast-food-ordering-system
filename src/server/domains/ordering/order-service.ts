import crypto from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { assertDatabaseReadyForRuntime, db, isDatabaseConfigured } from "@/lib/db";
import {
  orders,
  orderItems,
  orderItemModifiers,
  deliveryAddressSnapshot,
  orderStatusHistory,
  orderEvents,
  payments,
} from "@/lib/db/schema";
import { type CreateOrderRequest } from "@/lib/validation/order.schema";
import { calculateOrderTotals, type OrderCalculationResult } from "@/lib/pricing/calculator";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { AppError } from "@/lib/errors/app-error";

export type OrderStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PAID"
  | "CONFIRMED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, ReadonlyArray<OrderStatus>> = {
  DRAFT: ["PENDING_PAYMENT", "CANCELLED"],
  PENDING_PAYMENT: ["PAID", "CANCELLED", "REJECTED"],
  PAID: ["CONFIRMED", "CANCELLED", "REFUNDED"],
  CONFIRMED: ["ACCEPTED", "PREPARING", "CANCELLED", "REFUNDED"],
  ACCEPTED: ["PREPARING", "READY", "CANCELLED", "REFUNDED"],
  PREPARING: ["READY", "CANCELLED", "REFUNDED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "REFUNDED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  REJECTED: [],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

function assertValidStatusTransition(previousStatus: OrderStatus, newStatus: OrderStatus): void {
  if (previousStatus === newStatus) {
    return;
  }
  const allowed = VALID_STATUS_TRANSITIONS[previousStatus] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new AppError(
      "CONFLICT",
      `Invalid order status transition from '${previousStatus}' to '${newStatus}'.`,
      409
    );
  }
}

export interface StoredOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemNameSnapshot: string;
  basePriceMinorSnapshot: number;
  quantity: number;
  lineTotalMinor: number;
  modifiers: Array<{
    groupNameSnapshot: string;
    optionNameSnapshot: string;
    priceDeltaMinorSnapshot: number;
  }>;
}

export interface StoredOrder {
  id: string;
  orderNumber: string;
  trackingToken: string;
  userId?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  branchId: string;
  serviceMode: "DELIVERY" | "PICKUP";
  status: OrderStatus;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes?: string;
  cancelReason?: string;
  idempotencyKey?: string;
  deliveryAddress?: {
    streetAddress: string;
    unit?: string;
    city: string;
    postalCode: string;
    deliveryInstructions?: string;
  };
  items: StoredOrderItem[];
  statusHistory: Array<{
    previousStatus: OrderStatus | null;
    newStatus: OrderStatus;
    changedAt: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Offline fallback store ONLY for unit/dev tests when DATABASE_URL is not configured
const ordersMemoryStore = new Map<string, StoredOrder>();
const idempotencyStore = new Map<string, string>(); // idempotencyKey -> orderId
const outboxEventsStore: Array<{
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, any>;
  status: "PENDING" | "PUBLISHED";
  createdAt: string;
}> = [];

// Pre-populate with one realistic active order for instant tracking and kitchen testing in dev/test
const sampleInitialOrder: StoredOrder = {
  id: "ord-test-101",
  orderNumber: "FF-10492",
  trackingToken: "token_sample_guest_abc123xyz789",
  guestName: "Alex Morgan",
  guestEmail: "alex@example.com",
  guestPhone: "(555) 789-0123",
  branchId: "branch-1",
  serviceMode: "DELIVERY",
  status: "PREPARING",
  subtotalMinor: 2898,
  discountMinor: 0,
  deliveryFeeMinor: 499,
  taxMinor: 239,
  totalMinor: 3636,
  notes: "Extra napkins please",
  deliveryAddress: {
    streetAddress: "123 Market St, Suite 400",
    city: "San Francisco",
    postalCode: "94105",
    deliveryInstructions: "Call upon arrival",
  },
  items: [
    {
      id: "ord-item-1",
      orderId: "ord-test-101",
      menuItemId: "item-1",
      itemNameSnapshot: "The Truffle Umami Smashed Burger",
      basePriceMinorSnapshot: 1599,
      quantity: 1,
      lineTotalMinor: 1599,
      modifiers: [
        {
          groupNameSnapshot: "Patty Selection",
          optionNameSnapshot: "Single Patty (1/4 lb)",
          priceDeltaMinorSnapshot: 0,
        },
      ],
    },
    {
      id: "ord-item-2",
      orderId: "ord-test-101",
      menuItemId: "item-9",
      itemNameSnapshot: "Truffle Parmesan Hand-Cut Fries",
      basePriceMinorSnapshot: 749,
      quantity: 1,
      lineTotalMinor: 749,
      modifiers: [],
    },
  ],
  statusHistory: [
    { previousStatus: null, newStatus: "PENDING_PAYMENT", changedAt: new Date(Date.now() - 25 * 60000).toISOString() },
    { previousStatus: "PENDING_PAYMENT", newStatus: "PAID", changedAt: new Date(Date.now() - 22 * 60000).toISOString() },
    { previousStatus: "PAID", newStatus: "CONFIRMED", changedAt: new Date(Date.now() - 20 * 60000).toISOString() },
    { previousStatus: "CONFIRMED", newStatus: "ACCEPTED", changedAt: new Date(Date.now() - 15 * 60000).toISOString() },
    { previousStatus: "ACCEPTED", newStatus: "PREPARING", changedAt: new Date(Date.now() - 10 * 60000).toISOString() },
  ],
  createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
};
ordersMemoryStore.set(sampleInitialOrder.id, sampleInitialOrder);

/**
 * Batch-hydrates multiple order rows in 4 queries (orderItems, orderItemModifiers,
 * deliveryAddressSnapshot, orderStatusHistory) to avoid N+1 database queries.
 */
async function hydrateOrderRows(
  rows: Array<typeof orders.$inferSelect>
): Promise<StoredOrder[]> {
  if (rows.length === 0) {
    return [];
  }

  const orderIds = rows.map((r) => r.id);

  const [allItemRows, allDeliveryRows, allHistoryRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db
      .select()
      .from(deliveryAddressSnapshot)
      .where(inArray(deliveryAddressSnapshot.orderId, orderIds)),
    db
      .select()
      .from(orderStatusHistory)
      .where(inArray(orderStatusHistory.orderId, orderIds))
      .orderBy(asc(orderStatusHistory.createdAt)),
  ]);

  const itemIds = allItemRows.map((i) => i.id);
  const allModRows =
    itemIds.length > 0
      ? await db
          .select()
          .from(orderItemModifiers)
          .where(inArray(orderItemModifiers.orderItemId, itemIds))
      : [];

  const modsByItemId = new Map<string, Array<typeof orderItemModifiers.$inferSelect>>();
  for (const mod of allModRows) {
    const bucket = modsByItemId.get(mod.orderItemId) ?? [];
    bucket.push(mod);
    modsByItemId.set(mod.orderItemId, bucket);
  }

  const itemsByOrderId = new Map<string, StoredOrderItem[]>();
  for (const ir of allItemRows) {
    const itemMods = modsByItemId.get(ir.id) ?? [];
    const hydratedItem: StoredOrderItem = {
      id: ir.id,
      orderId: ir.orderId,
      menuItemId: ir.menuItemId || "unknown-item",
      itemNameSnapshot: ir.itemNameSnapshot,
      basePriceMinorSnapshot: ir.basePriceMinorSnapshot,
      quantity: ir.quantity,
      lineTotalMinor: ir.lineTotalMinor,
      modifiers: itemMods.map((m) => ({
        groupNameSnapshot: m.groupNameSnapshot,
        optionNameSnapshot: m.optionNameSnapshot,
        priceDeltaMinorSnapshot: m.priceDeltaMinorSnapshot,
      })),
    };
    const bucket = itemsByOrderId.get(ir.orderId) ?? [];
    bucket.push(hydratedItem);
    itemsByOrderId.set(ir.orderId, bucket);
  }

  const deliveryByOrderId = new Map<string, typeof deliveryAddressSnapshot.$inferSelect>();
  for (const dr of allDeliveryRows) {
    deliveryByOrderId.set(dr.orderId, dr);
  }

  const historyByOrderId = new Map<string, Array<typeof orderStatusHistory.$inferSelect>>();
  for (const hr of allHistoryRows) {
    const bucket = historyByOrderId.get(hr.orderId) ?? [];
    bucket.push(hr);
    historyByOrderId.set(hr.orderId, bucket);
  }

  return rows.map((row) => {
    const deliveryRow = deliveryByOrderId.get(row.id);
    const historyRows = historyByOrderId.get(row.id) ?? [];
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      trackingToken: row.trackingToken,
      userId: row.userId || undefined,
      guestName: row.guestName || "Guest",
      guestEmail: row.guestEmail || "",
      guestPhone: row.guestPhone || "",
      branchId: row.branchId,
      serviceMode: row.serviceMode as "DELIVERY" | "PICKUP",
      status: row.status as OrderStatus,
      subtotalMinor: row.subtotalMinor,
      discountMinor: row.discountMinor,
      deliveryFeeMinor: row.deliveryFeeMinor,
      taxMinor: row.taxMinor,
      totalMinor: row.totalMinor,
      notes: row.notes || undefined,
      cancelReason: row.cancelReason || undefined,
      idempotencyKey: row.idempotencyKey || undefined,
      deliveryAddress: deliveryRow
        ? {
            streetAddress: deliveryRow.streetAddress,
            unit: deliveryRow.unit || undefined,
            city: deliveryRow.city,
            postalCode: deliveryRow.postalCode,
            deliveryInstructions: deliveryRow.deliveryInstructions || undefined,
          }
        : undefined,
      items: itemsByOrderId.get(row.id) ?? [],
      statusHistory: historyRows.map((h) => ({
        previousStatus: (h.previousStatus as OrderStatus) || null,
        newStatus: h.newStatus as OrderStatus,
        changedAt: h.createdAt.toISOString(),
        note: h.note || undefined,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

async function hydrateOrderRow(row: typeof orders.$inferSelect): Promise<StoredOrder> {
  const [hydrated] = await hydrateOrderRows([row]);
  return hydrated;
}

export class OrderService {
  async createOrder(
    input: CreateOrderRequest,
    idempotencyKey?: string
  ): Promise<StoredOrder> {
    assertDatabaseReadyForRuntime();

    // 1. Idempotency Check
    if (idempotencyKey) {
      if (isDatabaseConfigured()) {
        const [existingRow] = await db
          .select()
          .from(orders)
          .where(eq(orders.idempotencyKey, idempotencyKey))
          .limit(1);
        if (existingRow) {
          return hydrateOrderRow(existingRow);
        }
      } else {
        const existingOrderId = idempotencyStore.get(idempotencyKey);
        if (existingOrderId) {
          const existingOrder = ordersMemoryStore.get(existingOrderId);
          if (existingOrder) {
            return existingOrder;
          }
        }
      }
    }

    // 2. Validate Branch
    const branch = await catalogService.getBranchById(input.branchId);
    if (!branch) {
      throw new AppError("NOT_FOUND", `Branch with ID '${input.branchId}' not found.`, 404);
    }

    // 3. Validate & resolve authoritative item prices and modifiers from CatalogService
    const resolvedItems = await catalogService.resolveAuthoritativeOrderItems(input.items);

    const calcItems = resolvedItems.map((item) => {
      const modifiers: Array<{ priceMinor: number }> = [];
      for (const group of Object.values(item.selectedModifiers)) {
        for (const opt of group) {
          modifiers.push({ priceMinor: opt.priceDeltaMinor });
        }
      }
      return {
        basePriceMinor: item.basePriceMinor,
        quantity: item.quantity,
        modifiers,
      };
    });

    const initialTotals = calculateOrderTotals({
      serviceMode: input.serviceMode,
      items: calcItems,
      deliveryFeeMinor: branch.deliveryFeeMinor,
    });

    // 4. Minimum order check for delivery
    if (input.serviceMode === "DELIVERY" && initialTotals.subtotalMinor < branch.minOrderMinor) {
      const minReq = (branch.minOrderMinor / 100).toFixed(2);
      throw new AppError(
        "MINIMUM_ORDER_NOT_MET",
        `Delivery requires a minimum subtotal of $${minReq}. Current subtotal is $${(
          initialTotals.subtotalMinor / 100
        ).toFixed(2)}.`,
        400
      );
    }

    // 5. Coupon validation
    let discountMinor = 0;
    if (input.couponCode) {
      const couponRes = await catalogService.validateCoupon(
        input.couponCode,
        initialTotals.subtotalMinor
      );
      discountMinor = couponRes.discountMinor;
    }

    // Final authoritatively calculated totals
    const finalTotals: OrderCalculationResult = calculateOrderTotals({
      serviceMode: input.serviceMode,
      items: calcItems,
      deliveryFeeMinor: branch.deliveryFeeMinor,
      discountMinor,
    });

    // 6. Generate collision-resistant IDs
    const orderId = `ord-${crypto.randomUUID()}`;
    const orderNumber = `FF-${Date.now().toString(36).toUpperCase().slice(-4)}${crypto.randomInt(1000, 9999)}`;
    const trackingToken = crypto.randomBytes(24).toString("hex");
    const nowDate = new Date();
    const now = nowDate.toISOString();

    // 7. Create immutable item snapshots from authoritative catalog items
    const storedItems: StoredOrderItem[] = resolvedItems.map((item) => {
      const itemModifiers: Array<{
        groupNameSnapshot: string;
        optionNameSnapshot: string;
        priceDeltaMinorSnapshot: number;
      }> = [];

      for (const [groupName, options] of Object.entries(item.selectedModifiers)) {
        for (const opt of options) {
          itemModifiers.push({
            groupNameSnapshot: groupName,
            optionNameSnapshot: opt.name,
            priceDeltaMinorSnapshot: opt.priceDeltaMinor,
          });
        }
      }

      const modTotal = itemModifiers.reduce((acc, m) => acc + m.priceDeltaMinorSnapshot, 0);
      const lineTotal = (item.basePriceMinor + modTotal) * item.quantity;

      return {
        id: `item-${crypto.randomUUID()}`,
        orderId,
        menuItemId: item.menuItemId,
        itemNameSnapshot: item.name,
        basePriceMinorSnapshot: item.basePriceMinor,
        quantity: item.quantity,
        lineTotalMinor: lineTotal,
        modifiers: itemModifiers,
      };
    });

    const isCashOrder = input.paymentMethod === "CASH";
    const initialStatus: OrderStatus = isCashOrder ? "CONFIRMED" : "PENDING_PAYMENT";
    const initialStatusNote = isCashOrder
      ? "Order confirmed with Cash payment on handoff."
      : "Order created, waiting for payment confirmation.";

    const newOrder: StoredOrder = {
      id: orderId,
      orderNumber,
      trackingToken,
      guestName: input.customer.fullName,
      guestEmail: input.customer.email,
      guestPhone: input.customer.phone,
      branchId: input.branchId,
      serviceMode: input.serviceMode,
      status: initialStatus,
      subtotalMinor: finalTotals.subtotalMinor,
      discountMinor: finalTotals.discountMinor,
      deliveryFeeMinor: finalTotals.deliveryFeeMinor,
      taxMinor: finalTotals.taxMinor,
      totalMinor: finalTotals.totalMinor,
      notes: input.notes,
      idempotencyKey,
      deliveryAddress: input.deliveryAddress,
      items: storedItems,
      statusHistory: [
        {
          previousStatus: null,
          newStatus: initialStatus,
          changedAt: now,
          note: initialStatusNote,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const outboxId = `evt-${crypto.randomUUID()}`;
    const outboxPayload = {
      orderId,
      orderNumber,
      totalMinor: newOrder.totalMinor,
      serviceMode: newOrder.serviceMode,
      branchId: newOrder.branchId,
    };

    if (isDatabaseConfigured()) {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(orders).values({
            id: newOrder.id,
            orderNumber: newOrder.orderNumber,
            trackingToken: newOrder.trackingToken,
            guestName: newOrder.guestName,
            guestEmail: newOrder.guestEmail,
            guestPhone: newOrder.guestPhone,
            branchId: newOrder.branchId,
            serviceMode: newOrder.serviceMode,
            status: newOrder.status,
            subtotalMinor: newOrder.subtotalMinor,
            discountMinor: newOrder.discountMinor,
            deliveryFeeMinor: newOrder.deliveryFeeMinor,
            taxMinor: newOrder.taxMinor,
            totalMinor: newOrder.totalMinor,
            notes: newOrder.notes || null,
            idempotencyKey: newOrder.idempotencyKey || null,
            createdAt: nowDate,
            updatedAt: nowDate,
          });

          for (const item of storedItems) {
            await tx.insert(orderItems).values({
              id: item.id,
              orderId: newOrder.id,
              menuItemId: item.menuItemId,
              itemNameSnapshot: item.itemNameSnapshot,
              basePriceMinorSnapshot: item.basePriceMinorSnapshot,
              quantity: item.quantity,
              lineTotalMinor: item.lineTotalMinor,
            });

            for (const mod of item.modifiers) {
              await tx.insert(orderItemModifiers).values({
                id: `mod-${crypto.randomUUID()}`,
                orderItemId: item.id,
                groupNameSnapshot: mod.groupNameSnapshot,
                optionNameSnapshot: mod.optionNameSnapshot,
                priceDeltaMinorSnapshot: mod.priceDeltaMinorSnapshot,
              });
            }
          }

          if (input.deliveryAddress) {
            await tx.insert(deliveryAddressSnapshot).values({
              id: `del-${crypto.randomUUID()}`,
              orderId: newOrder.id,
              streetAddress: input.deliveryAddress.streetAddress,
              unit: input.deliveryAddress.unit || null,
              city: input.deliveryAddress.city,
              postalCode: input.deliveryAddress.postalCode,
              deliveryInstructions: input.deliveryAddress.deliveryInstructions || null,
            });
          }

          await tx.insert(orderStatusHistory).values({
            id: `hist-${crypto.randomUUID()}`,
            orderId: newOrder.id,
            previousStatus: null,
            newStatus: initialStatus,
            note: initialStatusNote,
            createdAt: nowDate,
          });

          if (isCashOrder) {
            await tx.insert(payments).values({
              id: `pay-${crypto.randomUUID()}`,
              orderId: newOrder.id,
              provider: "CASH_ON_DELIVERY",
              status: "REQUIRES_PAYMENT_METHOD",
              amountMinor: newOrder.totalMinor,
              currency: "USD",
              createdAt: nowDate,
              updatedAt: nowDate,
            });
          }

          await tx.insert(orderEvents).values({
            id: outboxId,
            aggregateType: "ORDER",
            aggregateId: orderId,
            eventType: "order.created",
            payload: outboxPayload,
            status: "PENDING",
            createdAt: nowDate,
          });
        });
      } catch (err: any) {
        if (
          idempotencyKey &&
          (err.code === "23505" ||
            err.message?.includes("idempotency_key") ||
            err.detail?.includes("idempotency_key"))
        ) {
          const [existingRow] = await db
            .select()
            .from(orders)
            .where(eq(orders.idempotencyKey, idempotencyKey))
            .limit(1);
          if (existingRow) {
            return hydrateOrderRow(existingRow);
          }
        }
        throw err;
      }

      return newOrder;
    }

    // Memory fallback ONLY when DATABASE_URL is not configured (dev/test mode)
    ordersMemoryStore.set(orderId, newOrder);
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, orderId);
    }

    outboxEventsStore.push({
      id: outboxId,
      aggregateId: orderId,
      eventType: "order.created",
      payload: outboxPayload,
      status: "PENDING",
      createdAt: now,
    });

    return newOrder;
  }

  async getOrderById(orderId: string): Promise<StoredOrder | null> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [row] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      return row ? hydrateOrderRow(row) : null;
    }

    return ordersMemoryStore.get(orderId) || null;
  }

  async getOrderByTrackingToken(orderId: string, token: string): Promise<StoredOrder | null> {
    assertDatabaseReadyForRuntime();

    const order = await this.getOrderById(orderId);
    if (!order) return null;
    if (!token || order.trackingToken !== token) {
      throw new AppError("FORBIDDEN", "Invalid tracking token for this order.", 403);
    }
    return order;
  }

  async getAllOrders(): Promise<StoredOrder[]> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const rows = await db
        .select()
        .from(orders)
        .orderBy(desc(orders.createdAt))
        .limit(100);
      return hydrateOrderRows(rows);
    }

    return Array.from(ordersMemoryStore.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async transitionStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    expectedPreviousStatus?: OrderStatus,
    existingTx?: any
  ): Promise<StoredOrder> {
    assertDatabaseReadyForRuntime();

    const nowDate = new Date();
    const now = nowDate.toISOString();

    if (isDatabaseConfigured()) {
      const runner = existingTx || db;
      const [existingRow] = await runner
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!existingRow) {
        throw new AppError("NOT_FOUND", `Order '${orderId}' does not exist.`, 404);
      }

      const previousStatus = existingRow.status as OrderStatus;
      if (expectedPreviousStatus && previousStatus !== expectedPreviousStatus) {
        throw new AppError(
          "CONFLICT",
          `Stale status transition for order '${orderId}': expected previous status '${expectedPreviousStatus}', but current status is '${previousStatus}'.`,
          409
        );
      }

      if (previousStatus === newStatus) {
        return hydrateOrderRow(existingRow);
      }
      assertValidStatusTransition(previousStatus, newStatus);

      const outboxId = `evt-${crypto.randomUUID()}`;
      const outboxPayload = {
        orderId,
        previousStatus,
        newStatus,
        changedAt: now,
      };

      const executeTransition = async (tx: any) => {
        const updatedRows = await tx
          .update(orders)
          .set({ status: newStatus, updatedAt: nowDate })
          .where(and(eq(orders.id, orderId), eq(orders.status, previousStatus)))
          .returning({ id: orders.id });

        if (updatedRows.length === 0) {
          throw new AppError(
            "CONFLICT",
            `Concurrent status update conflict for order '${orderId}': status changed from '${previousStatus}' before transition to '${newStatus}' could complete.`,
            409
          );
        }

        await tx.insert(orderStatusHistory).values({
          id: `hist-${crypto.randomUUID()}`,
          orderId,
          previousStatus,
          newStatus,
          note: note || null,
          createdAt: nowDate,
        });

        await tx.insert(orderEvents).values({
          id: outboxId,
          aggregateType: "ORDER",
          aggregateId: orderId,
          eventType: "order.status_changed",
          payload: outboxPayload,
          status: "PENDING",
          createdAt: nowDate,
        });
      };

      if (existingTx) {
        await executeTransition(existingTx);
      } else {
        await db.transaction(executeTransition);
      }

      const updated = await this.getOrderById(orderId);
      if (!updated) {
        throw new AppError("NOT_FOUND", `Order '${orderId}' does not exist.`, 404);
      }
      return updated;
    }

    const order = ordersMemoryStore.get(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order '${orderId}' does not exist.`, 404);
    }

    const previousStatus = order.status;
    if (expectedPreviousStatus && previousStatus !== expectedPreviousStatus) {
      throw new AppError(
        "CONFLICT",
        `Stale status transition for order '${orderId}': expected previous status '${expectedPreviousStatus}', but current status is '${previousStatus}'.`,
        409
      );
    }

    if (previousStatus === newStatus) {
      return order;
    }
    assertValidStatusTransition(previousStatus, newStatus);

    // Yield a microtask so concurrent in-memory callers experience the same read-before-conditional-write window as PostgreSQL
    await Promise.resolve();

    if (order.status !== previousStatus) {
      throw new AppError(
        "CONFLICT",
        `Concurrent status update conflict for order '${orderId}': status changed from '${previousStatus}' to '${order.status}' before transition to '${newStatus}' could complete.`,
        409
      );
    }

    order.status = newStatus;
    order.updatedAt = now;
    order.statusHistory.push({
      previousStatus,
      newStatus,
      changedAt: now,
      note,
    });

    // Record outbox event in dev/test memory store
    outboxEventsStore.push({
      id: `evt-${crypto.randomUUID()}`,
      aggregateId: orderId,
      eventType: `order.status_changed`,
      payload: {
        orderId,
        previousStatus,
        newStatus,
        changedAt: now,
      },
      status: "PENDING",
      createdAt: now,
    });

    return order;
  }

  getOutboxEvents() {
    assertDatabaseReadyForRuntime();
    return [...outboxEventsStore];
  }
}

export const orderService = new OrderService();



