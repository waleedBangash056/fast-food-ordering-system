import { describe, it, expect } from "vitest";
import { catalogService } from "../src/server/domains/catalog/catalog-service";
import { orderService } from "../src/server/domains/ordering/order-service";
import { paymentService } from "../src/server/domains/payments/payment-provider";

describe("Complete Order & Payment Lifecycle (Rings B & C)", () => {
  it("retrieves catalog categories and items deterministically", async () => {
    const categories = await catalogService.getCategories();
    expect(categories.length).toBe(5);

    const items = await catalogService.getMenuItems();
    expect(items.length).toBe(20);

    const featured = await catalogService.getMenuItems({ featuredOnly: true });
    expect(featured.length).toBeGreaterThan(0);
  });

  it("applies coupons correctly according to business rules", async () => {
    // WELCOME10 is 10% off with min $15.00
    const validResult = await catalogService.validateCoupon("WELCOME10", 3000);
    expect(validResult.discountMinor).toBe(300); // 10% of 3000 is 300 ($3.00)

    // Fails when minimum subtotal not met
    await expect(catalogService.validateCoupon("WELCOME10", 1000)).rejects.toThrow();

    // Invalid coupon code
    await expect(catalogService.validateCoupon("NONEXISTENT", 5000)).rejects.toThrow();
  });

  it("creates an order, enforces idempotency, and transitions through payment and kitchen", async () => {
    const idempotencyKey = `test-idem-${Date.now()}`;

    const orderInput = {
      serviceMode: "DELIVERY" as const,
      branchId: "branch-1",
      customer: {
        fullName: "Jordan Lee",
        email: "jordan@example.com",
        phone: "555-123-4567",
      },
      deliveryAddress: {
        streetAddress: "456 Mission St",
        city: "San Francisco",
        postalCode: "94105",
      },
      items: [
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 2,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-double", name: "Double Patty (1/2 lb)", priceDeltaMinor: 350 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
      couponCode: "WELCOME10",
    };

    // 1. Create order
    const order = await orderService.createOrder(orderInput, idempotencyKey);
    expect(order.id).toBeDefined();
    expect(order.status).toBe("PENDING_PAYMENT");
    // (1599 + 350) * 2 = 3898 subtotal
    // 10% of 3898 is 390 discount
    // delivery fee for branch-1 is 499
    // taxable = 3898 - 390 = 3508
    // tax = Math.round(3508 * 0.0825) = 289
    // total = 3508 + 499 + 289 = 4296
    expect(order.subtotalMinor).toBe(3898);
    expect(order.discountMinor).toBe(390);
    expect(order.deliveryFeeMinor).toBe(499);
    expect(order.taxMinor).toBe(289);
    expect(order.totalMinor).toBe(4296);

    // 2. Idempotency: exact same key returns exact same order without duplicate row
    const duplicateOrder = await orderService.createOrder(orderInput, idempotencyKey);
    expect(duplicateOrder.id).toBe(order.id);
    expect(duplicateOrder.orderNumber).toBe(order.orderNumber);

    // 3. Payment webhook processing
    const webhookEventId = `evt_stripe_${Date.now()}`;
    const webhookRes = await paymentService.processWebhook("STRIPE", "sig_valid_test", {
      eventId: webhookEventId,
      provider: "STRIPE",
      eventType: "payment.succeeded",
      orderId: order.id,
      amountMinor: order.totalMinor,
    });
    expect(webhookRes.processed).toBe(true);
    expect(webhookRes.deduplicated).toBe(false);

    // Check status progressed to CONFIRMED
    const paidOrder = await orderService.getOrderById(order.id);
    expect(paidOrder?.status).toBe("CONFIRMED");

    // 4. Duplicate webhook test (idempotent deduplication)
    const duplicateWebhookRes = await paymentService.processWebhook("STRIPE", "sig_valid_test", {
      eventId: webhookEventId,
      provider: "STRIPE",
      eventType: "payment.succeeded",
      orderId: order.id,
      amountMinor: order.totalMinor,
    });
    expect(duplicateWebhookRes.processed).toBe(false);
    expect(duplicateWebhookRes.deduplicated).toBe(true);

    // 5. Kitchen flow: CONFIRMED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED
    await orderService.transitionStatus(order.id, "ACCEPTED", "Kitchen accepted");
    await orderService.transitionStatus(order.id, "PREPARING", "Grill started");
    await orderService.transitionStatus(order.id, "READY", "Boxed and bagged");
    await orderService.transitionStatus(order.id, "OUT_FOR_DELIVERY", "Courier picked up");
    const deliveredOrder = await orderService.transitionStatus(order.id, "DELIVERED", "Handed to customer");

    expect(deliveredOrder.status).toBe("DELIVERED");
    expect(deliveredOrder.statusHistory.length).toBe(8);

    // 6. BOLA / IDOR Guest tracking verification
    const authorizedFetch = await orderService.getOrderByTrackingToken(order.id, order.trackingToken);
    expect(authorizedFetch?.id).toBe(order.id);

    await expect(
      orderService.getOrderByTrackingToken(order.id, "forged_malicious_token")
    ).rejects.toThrow();
  });

  it("creates an order with paymentMethod CASH that is immediately CONFIRMED with an unpaid cash payment record", async () => {
    const cashOrder = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Cash Customer",
        email: "cash@example.com",
        phone: "555-7788",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 1,
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
      paymentMethod: "CASH",
    });

    expect(cashOrder.id).toBeDefined();
    expect(cashOrder.status).toBe("CONFIRMED");
    expect(cashOrder.statusHistory[0].newStatus).toBe("CONFIRMED");
    expect(cashOrder.statusHistory[0].note).toContain("Cash payment");

    // Kitchen can immediately accept and prepare cash orders without online payment webhook
    const acceptedCashOrder = await orderService.transitionStatus(
      cashOrder.id,
      "ACCEPTED",
      "Cash order accepted by kitchen"
    );
    expect(acceptedCashOrder.status).toBe("ACCEPTED");
  });
});
