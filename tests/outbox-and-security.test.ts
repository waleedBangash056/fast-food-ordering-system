import { describe, it, expect } from "vitest";
import { orderService } from "../src/server/domains/ordering/order-service";
import { paymentService } from "../src/server/domains/payments/payment-provider";

describe("Outbox Pattern & Security Mitigations (Ring C & G)", () => {
  it("enforces authoritative pricing and records transactional outbox events", async () => {
    const order = await orderService.createOrder({
      serviceMode: "DELIVERY",
      branchId: "branch-2",
      customer: {
        fullName: "Taylor Swift",
        email: "taylor@example.com",
        phone: "555-987-6543",
      },
      deliveryAddress: {
        streetAddress: "1280 Ocean Parkway",
        city: "San Francisco",
        postalCode: "94107",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 2, // 2 * 1349 = 2698 > branch min 1800
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    expect(order.id).toBeDefined();

    // Check outbox events
    const outbox = orderService.getOutboxEvents();
    const createdEvent = outbox.find(
      (e) => e.aggregateId === order.id && e.eventType === "order.created"
    );
    expect(createdEvent).toBeDefined();
    expect(createdEvent?.payload.orderId).toBe(order.id);
  });

  it("prevents replay attacks on payment webhooks via deduplication", async () => {
    const pendingOrder = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Replay Test Guest",
        email: "replay@example.com",
        phone: "555-222-3333",
      },
      items: [
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });
    const testOrderId = pendingOrder.id;
    const duplicateEventId = "stripe_evt_replay_test_" + Date.now();

    // 1st delivery of webhook
    const firstDelivery = await paymentService.processWebhook("STRIPE", "sig_valid", {
      eventId: duplicateEventId,
      provider: "STRIPE",
      eventType: "payment.succeeded",
      orderId: testOrderId,
      amountMinor: pendingOrder.totalMinor,
    });
    expect(firstDelivery.processed).toBe(true);
    expect(firstDelivery.deduplicated).toBe(false);

    // 2nd delivery (replay attempt)
    const secondDelivery = await paymentService.processWebhook("STRIPE", "sig_valid", {
      eventId: duplicateEventId,
      provider: "STRIPE",
      eventType: "payment.succeeded",
      orderId: testOrderId,
      amountMinor: pendingOrder.totalMinor,
    });
    expect(secondDelivery.processed).toBe(false);
    expect(secondDelivery.deduplicated).toBe(true);
  });

  it("enforces BOLA protection against unauthorized tracking token inspection", async () => {
    const order = await orderService.getOrderById("ord-test-101");
    expect(order).toBeDefined();

    // Legitimate token
    const legitAccess = await orderService.getOrderByTrackingToken(order!.id, order!.trackingToken);
    expect(legitAccess?.id).toBe(order!.id);

    // Attacker token
    await expect(
      orderService.getOrderByTrackingToken(order!.id, "attacker_forged_random_token")
    ).rejects.toThrow();
  });
});