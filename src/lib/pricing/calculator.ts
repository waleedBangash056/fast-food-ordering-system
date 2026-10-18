export interface LineItemPricingInput {
  basePriceMinor: number;
  quantity: number;
  modifiers?: Array<{
    priceMinor?: number;
    priceDeltaMinor?: number;
  }>;
  selectedModifiers?: Record<
    string,
    Array<{
      id?: string;
      name?: string;
      priceDeltaMinor: number;
    }>
  >;
}

export interface OrderCalculationInput {
  serviceMode: "DELIVERY" | "PICKUP";
  items: Array<{
    basePriceMinor: number;
    quantity: number;
    modifiers?: Array<{
      priceMinor: number;
    }>;
    selectedModifiers?: Record<
      string,
      Array<{
        id?: string;
        name?: string;
        priceDeltaMinor: number;
      }>
    >;
  }>;
  deliveryFeeMinor?: number;
  discountMinor?: number;
  taxRateBps?: number; // e.g. 825 for 8.25%
}

export interface OrderCalculationResult {
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
}

export function calculateItemLineTotalMinor(item: LineItemPricingInput): number {
  if (item.quantity <= 0) {
    throw new Error("Item quantity must be greater than zero.");
  }

  let modifierTotalMinor = 0;

  if (item.modifiers) {
    for (const mod of item.modifiers) {
      modifierTotalMinor += mod.priceMinor ?? mod.priceDeltaMinor ?? 0;
    }
  }

  if (item.selectedModifiers) {
    for (const group of Object.values(item.selectedModifiers)) {
      for (const opt of group) {
        modifierTotalMinor += opt.priceDeltaMinor || 0;
      }
    }
  }

  const unitPriceMinor = item.basePriceMinor + modifierTotalMinor;
  return unitPriceMinor * item.quantity;
}

export function calculateOrderTotals(input: OrderCalculationInput): OrderCalculationResult {
  if (!input.items || input.items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  let subtotalMinor = 0;

  for (const item of input.items) {
    subtotalMinor += calculateItemLineTotalMinor(item);
  }

  const deliveryFeeMinor = input.serviceMode === "DELIVERY" ? (input.deliveryFeeMinor ?? 499) : 0;
  const rawDiscountMinor = input.discountMinor ?? 0;
  // Discount cannot exceed subtotal
  const discountMinor = Math.min(rawDiscountMinor, subtotalMinor);

  const taxableAmountMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxRateBps = input.taxRateBps ?? 825; // 8.25% default
  const taxMinor = Math.round((taxableAmountMinor * taxRateBps) / 10000);

  const totalMinor = taxableAmountMinor + deliveryFeeMinor + taxMinor;

  return {
    subtotalMinor,
    deliveryFeeMinor,
    discountMinor,
    taxMinor,
    totalMinor,
  };
}
