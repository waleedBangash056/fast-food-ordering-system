import { z } from "zod";

export const CartModifierOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceDeltaMinor: z.number().int().nonnegative(),
});

export const CartItemSchema = z.object({
  menuItemId: z.string(),
  name: z.string(),
  basePriceMinor: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  selectedModifiers: z.record(z.string(), z.array(CartModifierOptionSchema)),
  specialInstructions: z.string().max(250).optional(),
});

export const CartValidationRequestSchema = z.object({
  serviceMode: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
  branchId: z.string().optional(),
  items: z.array(CartItemSchema).min(1, "Cart cannot be empty"),
  couponCode: z.string().trim().optional(),
});

export type CartItemInput = z.infer<typeof CartItemSchema>;
export type CartValidationRequest = z.infer<typeof CartValidationRequestSchema>;
