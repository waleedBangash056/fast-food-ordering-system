import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { assertDatabaseReadyForRuntime, db, isDatabaseConfigured } from "@/lib/db";
import { payments, paymentEvents, orders } from "@/lib/db/schema";
import { orderService } from "@/server/domains/ordering/order-service";
import { AppError } from "@/lib/errors/app-error";

export interface PaymentIntentResult {
  intentId: string;
  clientSecret: string;
  amountMinor: number;
  currency: string;
  provider: string;
  orderStatus: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  provider: string;
  eventType: "payment.succeeded" | "payment.failed";
  orderId: string;
  amountMinor: number;
  currency?: string;
  intentId?: string;
}

const EXPECTED_CURRENCY = "USD";
const SUPPORTED_LIVE_PROVIDERS = new Set(["STRIPE", "HMAC_SIGNED"]);

// Offline fallback registry for webhook deduplication ONLY when DATABASE_URL is not configured in dev/test
const processedWebhookEvents = new Set<string>();
// Offline fallback registry for payment intents ONLY when DATABASE_URL is not configured in dev/test
const inMemoryPaymentIntents = new Map<string, PaymentIntentResult>();

export function resetInMemoryPaymentStores(): void {
  processedWebhookEvents.clear();
  inMemoryPaymentIntents.clear();
}

/**
 * In production (NODE_ENV === "production"), mock payments are NEVER allowed,
 * even if PAYMENT_MODE=MOCK is accidentally configured in the environment.
 */
export function isMockPaymentAllowed(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  const explicitMode = process.env.PAYMENT_MODE?.trim().toUpperCase();
  if (
    explicitMode === "LIVE" ||
    explicitMode === "DISABLED" ||
    explicitMode === "STRIPE" ||
    explicitMode === "HMAC_SIGNED"
  ) {
    return false;
  }
  return true;
}

export function isPaymentProcessingDisabled(): boolean {
  return process.env.PAYMENT_MODE?.trim().toUpperCase() === "DISABLED";
}

export function computeWebhookSignature(rawPayload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawPayload, "utf8").digest("hex");
}

function timingSafeHexMatch(expectedHex: string, candidate: string): boolean {
  const cleanCandidate = candidate
    .trim()
    .replace(/^sha256=/i, "")
    .replace(/^v1=/i, "");
  const expectedBuf = Buffer.from(expectedHex, "utf8");
  const candidateBuf = Buffer.from(cleanCandidate, "utf8");
  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}

/**
 * Verifies either a Stripe-style `t=<timestamp>,v1=<hex>` signature header
 * or a direct `sha256=<hex>` / `<hex>` HMAC-SHA256 signature.
 */
function verifyCryptographicWebhookSignature(
  rawSignature: string,
  payloadToVerify: string,
  secret: string
): boolean {
  const trimmed = rawSignature.trim();

  // Check for Stripe-style timestamped header: t=1712345678,v1=abcdef...
  if (trimmed.includes("t=") && trimmed.includes("v1=")) {
    const parts = trimmed.split(",").map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith("t="));
    const v1Parts = parts.filter((p) => p.startsWith("v1="));
    if (!tPart || v1Parts.length === 0) {
      return false;
    }
    const timestampStr = tPart.slice(2);
    const timestampSec = Number(timestampStr);
    if (!Number.isFinite(timestampSec) || timestampSec <= 0) {
      return false;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > 300) {
      return false;
    }
    const signedPayload = `${timestampStr}.${payloadToVerify}`;
    const expectedHex = computeWebhookSignature(signedPayload, secret);
    return v1Parts.some((v1) => timingSafeHexMatch(expectedHex, v1.slice(3)));
  }

  const expectedHex = computeWebhookSignature(payloadToVerify, secret);
  return timingSafeHexMatch(expectedHex, trimmed);
}

export class PaymentService {
  async createPaymentIntent(
    orderId: string,
    provider: "STRIPE" | "MOCK" = "MOCK",
    options?: { trackingToken?: string; simulateCaptureInSandbox?: boolean }
  ): Promise<PaymentIntentResult> {
    const isProd = process.env.NODE_ENV === "production";
    const mockAllowed = isMockPaymentAllowed();

    if (isPaymentProcessingDisabled()) {
      throw new AppError(
        "PAYMENT_PROVIDER_DISABLED",
        "Payment processing is currently disabled (PAYMENT_MODE=DISABLED).",
        503
      );
    }

    if (provider === "MOCK" && (isProd || !mockAllowed)) {
      throw new AppError(
        "PAYMENT_PROVIDER_DISABLED",
        "Mock payment intents are strictly forbidden in production or when mock payments are disabled.",
        403
      );
    }

    if (options?.simulateCaptureInSandbox && (isProd || !mockAllowed)) {
      throw new AppError(
        "PAYMENT_SIMULATION_FORBIDDEN",
        "Simulated payment capture is strictly forbidden in production.",
        403
      );
    }

    // Fail closed in production until a real upstream payment provider SDK is integrated
    if (isProd) {
      throw new AppError(
        "PAYMENT_PROVIDER_DISABLED",
        `Live payment provider integration (${provider}) is not yet enabled in production. Unsupported production payment paths fail closed.`,
        503
      );
    }

    assertDatabaseReadyForRuntime();

    const order = await orderService.getOrderById(orderId);
    if (!order) {
      throw new AppError("NOT_FOUND", `Order '${orderId}' does not exist.`, 404);
    }

    if (order.status !== "PENDING_PAYMENT") {
      throw new AppError(
        "CONFLICT",
        `Order is not awaiting payment. Current status: ${order.status}`,
        409
      );
    }

    let intentId: string;
    let clientSecret: string;

    if (isDatabaseConfigured()) {
      // Re-use existing valid pending payment intent for this order and provider
      const [existingPayment] = await db
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.orderId, order.id),
            eq(payments.provider, provider),
            eq(payments.status, "REQUIRES_PAYMENT_METHOD"),
            eq(payments.amountMinor, order.totalMinor),
            eq(payments.currency, EXPECTED_CURRENCY)
          )
        )
        .limit(1);

      if (existingPayment && existingPayment.providerIntentId) {
        intentId = existingPayment.providerIntentId;
        clientSecret =
          (existingPayment.metadata as any)?.clientSecret ||
          `${intentId}_secret_${crypto.randomBytes(12).toString("hex")}`;
      } else {
        intentId = `pi_${crypto.randomBytes(16).toString("hex")}`;
        clientSecret = `${intentId}_secret_${crypto.randomBytes(12).toString("hex")}`;

        await db
          .insert(payments)
          .values({
            id: `pay-${crypto.randomUUID()}`,
            orderId: order.id,
            provider,
            providerIntentId: intentId,
            amountMinor: order.totalMinor,
            currency: EXPECTED_CURRENCY,
            status: "REQUIRES_PAYMENT_METHOD",
            metadata: { clientSecret },
          })
          .onConflictDoNothing();
      }
    } else {
      const intentKey = `${order.id}:${provider}`;
      const existingMemoryIntent = inMemoryPaymentIntents.get(intentKey);
      if (
        existingMemoryIntent &&
        existingMemoryIntent.amountMinor === order.totalMinor &&
        existingMemoryIntent.currency === EXPECTED_CURRENCY &&
        existingMemoryIntent.orderStatus === "PENDING_PAYMENT"
      ) {
        intentId = existingMemoryIntent.intentId;
        clientSecret = existingMemoryIntent.clientSecret;
      } else {
        intentId = `pi_${crypto.randomBytes(16).toString("hex")}`;
        clientSecret = `${intentId}_secret_${crypto.randomBytes(12).toString("hex")}`;
        inMemoryPaymentIntents.set(intentKey, {
          intentId,
          clientSecret,
          amountMinor: order.totalMinor,
          currency: EXPECTED_CURRENCY,
          provider,
          orderStatus: order.status,
        });
      }
    }

    let currentStatus: string = order.status;

    if (options?.simulateCaptureInSandbox && mockAllowed) {
      if (!options.trackingToken || options.trackingToken !== order.trackingToken) {
        throw new AppError(
          "FORBIDDEN",
          "Valid order tracking token is required for sandbox payment confirmation.",
          403
        );
      }

      await orderService.transitionStatus(
        order.id,
        "PAID",
        `Sandbox payment captured via ${provider} (${intentId})`
      );
      const confirmed = await orderService.transitionStatus(
        order.id,
        "CONFIRMED",
        "Order automatically confirmed and queued for kitchen processing."
      );
      currentStatus = confirmed.status;

      if (isDatabaseConfigured()) {
        await db
          .update(payments)
          .set({ status: "SUCCEEDED", updatedAt: new Date() })
          .where(eq(payments.providerIntentId, intentId));
      } else {
        const intentKey = `${order.id}:${provider}`;
        const memIntent = inMemoryPaymentIntents.get(intentKey);
        if (memIntent) {
          memIntent.orderStatus = currentStatus;
        }
      }
    }

    return {
      intentId,
      clientSecret,
      amountMinor: order.totalMinor,
      currency: EXPECTED_CURRENCY,
      provider,
      orderStatus: currentStatus,
    };
  }

  private verifySignature(
    normalizedProvider: string,
    rawSignature: string | null,
    event: PaymentWebhookEvent,
    rawBody?: string
  ): void {
    const isProd = process.env.NODE_ENV === "production";
    const mockAllowed = isMockPaymentAllowed();

    if (normalizedProvider === "MOCK" && (isProd || !mockAllowed)) {
      throw new AppError(
        "PAYMENT_PROVIDER_DISABLED",
        "Mock payment webhooks are strictly forbidden in production.",
        403
      );
    }

    if ((isProd || !mockAllowed) && !SUPPORTED_LIVE_PROVIDERS.has(normalizedProvider)) {
      throw new AppError(
        "WEBHOOK_PROVIDER_UNSUPPORTED",
        `Unsupported payment webhook provider '${normalizedProvider}' in production.`,
        400
      );
    }

    if (!rawSignature || rawSignature.trim().length === 0) {
      throw new AppError(
        "WEBHOOK_SIGNATURE_MISSING",
        "Missing cryptographic webhook signature header.",
        401
      );
    }

    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    const requireCryptographicHmac = isProd || !mockAllowed;

    if (requireCryptographicHmac) {
      if (!webhookSecret || webhookSecret.length < 16) {
        throw new AppError(
          "WEBHOOK_CONFIG_ERROR",
          "PAYMENT_WEBHOOK_SECRET (minimum 16 characters) must be configured in production to process payment webhooks.",
          500
        );
      }
      const payloadToVerify = rawBody ?? JSON.stringify(event);
      if (!verifyCryptographicWebhookSignature(rawSignature, payloadToVerify, webhookSecret)) {
        throw new AppError(
          "WEBHOOK_SIGNATURE_INVALID",
          "Invalid webhook HMAC signature.",
          401
        );
      }
      return;
    }

    // In non-production / explicit dev-test mode:
    if (webhookSecret && webhookSecret.length >= 16) {
      const payloadToVerify = rawBody ?? JSON.stringify(event);
      if (verifyCryptographicWebhookSignature(rawSignature, payloadToVerify, webhookSecret)) {
        return;
      }
    }

    if (!rawSignature.startsWith("sig_valid")) {
      throw new AppError(
        "WEBHOOK_SIGNATURE_INVALID",
        "Invalid webhook signature.",
        401
      );
    }
  }

  async processWebhook(
    provider: string,
    rawSignature: string | null,
    event: PaymentWebhookEvent,
    rawBody?: string
  ): Promise<{ processed: boolean; deduplicated: boolean; orderId: string }> {
    if (isPaymentProcessingDisabled()) {
      throw new AppError(
        "PAYMENT_PROVIDER_DISABLED",
        "Payment webhook processing is disabled (PAYMENT_MODE=DISABLED).",
        503
      );
    }

    const normalizedProvider = provider.trim().toUpperCase();
    const payloadProvider = event.provider?.trim().toUpperCase();
    if (payloadProvider && payloadProvider !== normalizedProvider) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Webhook payload provider (${payloadProvider}) does not match route provider (${normalizedProvider}).`,
        400
      );
    }

    // 1. Verify webhook authenticity and provider safety BEFORE touching database or order state
    this.verifySignature(normalizedProvider, rawSignature, event, rawBody);

    assertDatabaseReadyForRuntime();

    const eventKey = `${normalizedProvider}:${event.eventId}`;

    if (isDatabaseConfigured()) {
      return await db.transaction(async (tx) => {
        // Atomic conflict-safe insert: prevents race conditions across concurrent deliveries
        const insertedEvents = await tx
          .insert(paymentEvents)
          .values({
            id: `pe-${crypto.randomUUID()}`,
            provider: normalizedProvider,
            providerEventId: event.eventId,
            eventType: event.eventType,
            payload: event,
            status: "PROCESSED",
            processedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: paymentEvents.id });

        if (insertedEvents.length === 0) {
          // Event was already processed by a concurrent or prior delivery
          return { processed: false, deduplicated: true, orderId: event.orderId };
        }

        const [orderRow] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, event.orderId))
          .limit(1);

        if (!orderRow) {
          throw new AppError("NOT_FOUND", `Order '${event.orderId}' not found for webhook.`, 404);
        }

        const paymentConditions = [
          eq(payments.orderId, orderRow.id),
          eq(payments.provider, normalizedProvider),
        ];
        if (event.intentId) {
          paymentConditions.push(eq(payments.providerIntentId, event.intentId));
        }

        const [paymentRow] = await tx
          .select()
          .from(payments)
          .where(and(...paymentConditions))
          .limit(1);

        if (event.eventType === "payment.succeeded") {
          // Require explicit currency in production; in dev/test default to USD only when omitted
          if (process.env.NODE_ENV === "production" && !event.currency) {
            throw new AppError(
              "PAYMENT_CURRENCY_MISMATCH",
              "Webhook payment currency is required in production.",
              400
            );
          }

          const receivedCurrency = (event.currency ?? EXPECTED_CURRENCY).trim().toUpperCase();
          if (receivedCurrency !== EXPECTED_CURRENCY) {
            throw new AppError(
              "PAYMENT_CURRENCY_MISMATCH",
              `Webhook payment currency (${receivedCurrency}) does not match expected order currency (${EXPECTED_CURRENCY}).`,
              400
            );
          }

          // Enforce EXACT amount match against expected order total (never allow underpayment OR overpayment)
          if (typeof event.amountMinor !== "number" || event.amountMinor !== orderRow.totalMinor) {
            throw new AppError(
              "PAYMENT_AMOUNT_MISMATCH",
              `Webhook payment amount (${event.amountMinor}) does not exactly match order total (${orderRow.totalMinor}).`,
              400
            );
          }

          if (paymentRow) {
            if (paymentRow.amountMinor !== event.amountMinor) {
              throw new AppError(
                "PAYMENT_AMOUNT_MISMATCH",
                `Webhook amount (${event.amountMinor}) does not match persisted payment intent amount (${paymentRow.amountMinor}).`,
                400
              );
            }
            if (paymentRow.currency.toUpperCase() !== receivedCurrency) {
              throw new AppError(
                "PAYMENT_CURRENCY_MISMATCH",
                `Webhook currency (${receivedCurrency}) does not match persisted payment intent currency (${paymentRow.currency}).`,
                400
              );
            }
          }

          const VALID_PAID_STATES = new Set([
            "PAID",
            "CONFIRMED",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
          ]);

          if (VALID_PAID_STATES.has(orderRow.status)) {
            // Distinct success event for an order already in PAID or fulfillment pipeline:
            // acknowledge deduplication without attempting duplicate status transitions.
            if (paymentRow && paymentRow.status !== "SUCCEEDED") {
              await tx
                .update(payments)
                .set({ status: "SUCCEEDED", updatedAt: new Date() })
                .where(eq(payments.id, paymentRow.id));
            }
            return { processed: false, deduplicated: true, orderId: event.orderId };
          }

          if (orderRow.status === "CANCELLED") {
            // Payment succeeded on an already-cancelled order: flag for reconciliation/refund, do not confirm
            if (paymentRow) {
              await tx
                .update(payments)
                .set({
                  status: "REQUIRES_REFUND",
                  metadata: {
                    ...(paymentRow.metadata as any),
                    reconciliationAlert: "PAYMENT_SUCCEEDED_AFTER_CANCELLATION",
                    eventId: event.eventId,
                  },
                  updatedAt: new Date(),
                })
                .where(eq(payments.id, paymentRow.id));
            }
            return { processed: false, deduplicated: false, orderId: event.orderId };
          }

          // Transition within the same transaction: PENDING_PAYMENT -> PAID -> CONFIRMED
          await orderService.transitionStatus(
            event.orderId,
            "PAID",
            `Payment confirmed via ${normalizedProvider} (event: ${event.eventId})`,
            "PENDING_PAYMENT",
            tx
          );

          await orderService.transitionStatus(
            event.orderId,
            "CONFIRMED",
            "Order automatically confirmed and queued for kitchen processing.",
            "PAID",
            tx
          );

          if (paymentRow) {
            await tx
              .update(payments)
              .set({ status: "SUCCEEDED", updatedAt: new Date() })
              .where(eq(payments.id, paymentRow.id));
          }
        } else if (event.eventType === "payment.failed") {
          // Record failure on the matching payment attempt row without cancelling the order,
          // leaving the order in PENDING_PAYMENT so the customer can retry with another method.
          if (paymentRow) {
            await tx
              .update(payments)
              .set({ status: "FAILED", updatedAt: new Date() })
              .where(eq(payments.id, paymentRow.id));
          }
        }

        return { processed: true, deduplicated: false, orderId: event.orderId };
      });
      }

      // In-memory test / dev fallback
      if (processedWebhookEvents.has(eventKey)) {
        return { processed: false, deduplicated: true, orderId: event.orderId };
      }
      processedWebhookEvents.add(eventKey);

      try {
        const order = await orderService.getOrderById(event.orderId);
        if (!order) {
          throw new AppError("NOT_FOUND", `Order '${event.orderId}' not found for webhook.`, 404);
        }

        if (event.eventType === "payment.succeeded") {
          if (process.env.NODE_ENV === "production" && !event.currency) {
            throw new AppError(
              "PAYMENT_CURRENCY_MISMATCH",
              "Webhook payment currency is required in production.",
              400
            );
          }

          const receivedCurrency = (event.currency ?? EXPECTED_CURRENCY).trim().toUpperCase();
          if (receivedCurrency !== EXPECTED_CURRENCY) {
            throw new AppError(
              "PAYMENT_CURRENCY_MISMATCH",
              `Webhook payment currency (${receivedCurrency}) does not match expected order currency (${EXPECTED_CURRENCY}).`,
              400
            );
          }

          if (typeof event.amountMinor !== "number" || event.amountMinor !== order.totalMinor) {
            throw new AppError(
              "PAYMENT_AMOUNT_MISMATCH",
              `Webhook payment amount (${event.amountMinor}) does not exactly match order total (${order.totalMinor}).`,
              400
            );
          }

          const VALID_PAID_STATES = new Set([
            "PAID",
            "CONFIRMED",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
          ]);

          if (VALID_PAID_STATES.has(order.status)) {
            return { processed: false, deduplicated: true, orderId: event.orderId };
          }

          if (order.status === "CANCELLED") {
            return { processed: false, deduplicated: false, orderId: event.orderId };
          }

          await orderService.transitionStatus(
            event.orderId,
            "PAID",
            `Payment confirmed via ${normalizedProvider} (event: ${event.eventId})`,
            "PENDING_PAYMENT"
          );

          await orderService.transitionStatus(
            event.orderId,
            "CONFIRMED",
            "Order automatically confirmed and queued for kitchen processing.",
            "PAID"
          );
        } else if (event.eventType === "payment.failed") {
          // Record failure on the payment attempt without cancelling the order in PENDING_PAYMENT
        }

        return { processed: true, deduplicated: false, orderId: event.orderId };
    } catch (err) {
      processedWebhookEvents.delete(eventKey);
      throw err;
    }
  }
}

export const paymentService = new PaymentService();



