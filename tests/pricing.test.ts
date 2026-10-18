import { describe, it, expect } from "vitest";
import { calculateOrderTotals } from "../src/lib/pricing/calculator";

describe("Pricing Calculator (Money & Integer Invariants)", () => {
  it("calculates simple item totals in delivery mode", () => {
    const result = calculateOrderTotals({
      serviceMode: "DELIVERY",
      items: [
        {
          basePriceMinor: 1299, // $12.99
          quantity: 2,
          modifiers: [
            { priceMinor: 150 }, // $1.50
          ],
        },
      ],
      deliveryFeeMinor: 499, // $4.99
      taxRateBps: 825, // 8.25%
    });

    // unit price: 1299 + 150 = 1449 ($14.49)
    // subtotal: 1449 * 2 = 2898 ($28.98)
    // tax: Math.round((2898 * 825) / 10000) = Math.round(2390850 / 10000) = 239 ($2.39)
    // total: 2898 + 499 + 239 = 3636 ($36.36)
    expect(result.subtotalMinor).toBe(2898);
    expect(result.deliveryFeeMinor).toBe(499);
    expect(result.taxMinor).toBe(239);
    expect(result.totalMinor).toBe(3636);
  });

  it("sets delivery fee to 0 for PICKUP mode", () => {
    const result = calculateOrderTotals({
      serviceMode: "PICKUP",
      items: [
        {
          basePriceMinor: 1000,
          quantity: 1,
          modifiers: [],
        },
      ],
      deliveryFeeMinor: 499, // should be ignored for pickup
      taxRateBps: 800, // 8.00%
    });

    expect(result.subtotalMinor).toBe(1000);
    expect(result.deliveryFeeMinor).toBe(0);
    expect(result.taxMinor).toBe(80);
    expect(result.totalMinor).toBe(1080);
  });

  it("caps discount to subtotal to prevent negative totals", () => {
    const result = calculateOrderTotals({
      serviceMode: "PICKUP",
      items: [
        {
          basePriceMinor: 500,
          quantity: 1,
          modifiers: [],
        },
      ],
      discountMinor: 1000, // discount > subtotal
      taxRateBps: 800,
    });

    expect(result.subtotalMinor).toBe(500);
    expect(result.discountMinor).toBe(500);
    expect(result.taxMinor).toBe(0);
    expect(result.totalMinor).toBe(0);
  });

  it("throws error for empty order items or non-positive quantities", () => {
    expect(() =>
      calculateOrderTotals({
        serviceMode: "DELIVERY",
        items: [],
      })
    ).toThrow();

    expect(() =>
      calculateOrderTotals({
        serviceMode: "DELIVERY",
        items: [{ basePriceMinor: 1000, quantity: 0, modifiers: [] }],
      })
    ).toThrow();
  });
});
