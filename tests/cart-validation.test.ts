import { describe, it, expect } from "vitest";
import { CartValidationRequestSchema } from "../src/lib/validation/cart.schema";
import {
  calculateItemLineTotalMinor,
  calculateOrderTotals,
} from "../src/lib/pricing/calculator";

describe("Cart Validation & Modifier Rules (Ring B & C)", () => {
  it("validates a compliant cart item structure", () => {
    const payload = {
      serviceMode: "DELIVERY",
      items: [
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty", priceDeltaMinor: 0 },
            ],
            "Premium Add-ons": [
              { id: "opt-bacon", name: "Smoked Bacon", priceDeltaMinor: 200 },
            ],
          },
        },
      ],
      couponCode: "WELCOME10",
    };

    const parsed = CartValidationRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty items cart", () => {
    const payload = {
      serviceMode: "DELIVERY",
      items: [],
    };

    const parsed = CartValidationRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("rejects negative or zero item quantities", () => {
    const payload = {
      serviceMode: "DELIVERY",
      items: [
        {
          menuItemId: "item-1",
          name: "Burger",
          basePriceMinor: 1599,
          quantity: 0,
          selectedModifiers: {},
        },
      ],
    };

    const parsed = CartValidationRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(false);
  });

  it("calculates multi-modifier sums correctly into line totals", () => {
    const totals = calculateOrderTotals({
      serviceMode: "PICKUP",
      items: [
        {
          basePriceMinor: 1400,
          quantity: 3,
          modifiers: [
            { priceMinor: 200 },
            { priceMinor: 150 },
            { priceMinor: 50 },
          ], // total mod = 400. unit = 1800. 3 * 1800 = 5400.
        },
      ],
    });

    expect(totals.subtotalMinor).toBe(5400);
    expect(totals.deliveryFeeMinor).toBe(0);
  });

  it("calculates checkout line totals incorporating selectedModifiers before multiplying by quantity", () => {
    // 1. Item with no modifiers (single and multiple quantities)
    expect(
      calculateItemLineTotalMinor({
        basePriceMinor: 1599,
        quantity: 1,
        selectedModifiers: {},
      })
    ).toBe(1599);

    expect(
      calculateItemLineTotalMinor({
        basePriceMinor: 1599,
        quantity: 3,
        selectedModifiers: {},
      })
    ).toBe(4797);

    // 2. Item with modifiers and quantity = 1
    expect(
      calculateItemLineTotalMinor({
        basePriceMinor: 1599,
        quantity: 1,
        selectedModifiers: {
          "Patty Selection": [
            { id: "opt-double", name: "Double Patty (1/2 lb)", priceDeltaMinor: 350 },
          ],
          "Cheese Choice": [
            { id: "opt-gouda", name: "Dutch Smoked Gouda", priceDeltaMinor: 100 },
          ],
        },
      })
    ).toBe(2049); // 1599 + 350 + 100

    // 3. Item with multiple modifier groups and multiple quantities (quantity = 2)
    // Unit price = 1599 + 350 + 100 + 200 + 175 = 2424 -> * 2 = 4848
    expect(
      calculateItemLineTotalMinor({
        basePriceMinor: 1599,
        quantity: 2,
        selectedModifiers: {
          "Patty Selection": [
            { id: "opt-double", name: "Double Patty (1/2 lb)", priceDeltaMinor: 350 },
          ],
          "Cheese Choice": [
            { id: "opt-gouda", name: "Dutch Smoked Gouda", priceDeltaMinor: 100 },
          ],
          "Premium Add-ons": [
            { id: "opt-bacon", name: "Applewood Smoked Bacon", priceDeltaMinor: 200 },
            { id: "opt-avocado", name: "Hass Avocado Slices", priceDeltaMinor: 175 },
          ],
        },
      })
    ).toBe(4848);
  });

  it("calculates totals accurately with coupon application, removal, and minimum subtotal checks", () => {
    const baseItems = [
      {
        basePriceMinor: 2000,
        quantity: 2, // subtotal = 4000 ($40.00)
      },
    ];

    // 1. Initial totals without coupon (Delivery fee = 499)
    const initialTotals = calculateOrderTotals({
      serviceMode: "DELIVERY",
      items: baseItems,
    });
    expect(initialTotals.subtotalMinor).toBe(4000);
    expect(initialTotals.discountMinor).toBe(0);
    expect(initialTotals.deliveryFeeMinor).toBe(499);
    // Taxable = 4000, tax = Math.round(4000 * 0.0825) = 330, total = 4000 + 499 + 330 = 4829
    expect(initialTotals.taxMinor).toBe(330);
    expect(initialTotals.totalMinor).toBe(4829);

    // 2. Apply 10% coupon ($4.00 = 400 minor units discount)
    const withCouponTotals = calculateOrderTotals({
      serviceMode: "DELIVERY",
      items: baseItems,
      discountMinor: 400,
    });
    expect(withCouponTotals.subtotalMinor).toBe(4000);
    expect(withCouponTotals.discountMinor).toBe(400);
    expect(withCouponTotals.deliveryFeeMinor).toBe(499);
    // Taxable = 3600, tax = Math.round(3600 * 0.0825) = 297, total = 3600 + 499 + 297 = 4396
    expect(withCouponTotals.taxMinor).toBe(297);
    expect(withCouponTotals.totalMinor).toBe(4396);

    // 3. Remove coupon -> restores original totals
    const restoredTotals = calculateOrderTotals({
      serviceMode: "DELIVERY",
      items: baseItems,
      discountMinor: 0,
    });
    expect(restoredTotals.discountMinor).toBe(0);
    expect(restoredTotals.totalMinor).toBe(initialTotals.totalMinor);

    // 4. Discount cannot exceed subtotal (capped at subtotal)
    const cappedTotals = calculateOrderTotals({
      serviceMode: "PICKUP",
      items: [{ basePriceMinor: 1000, quantity: 1 }],
      discountMinor: 5000, // Excessive discount ($50 on $10 order)
    });
    expect(cappedTotals.subtotalMinor).toBe(1000);
    expect(cappedTotals.discountMinor).toBe(1000);
    expect(cappedTotals.totalMinor).toBe(0);
  });
});