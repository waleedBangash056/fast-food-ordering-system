import { z } from "zod";
import { CartItemSchema } from "./cart.schema";

export const DeliveryAddressInputSchema = z.object({
  streetAddress: z.string().min(5, "Street address must be at least 5 characters"),
  unit: z.string().optional(),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(3, "Postal code is required"),
  deliveryInstructions: z.string().max(250).optional(),
});

export const CustomerInfoSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(7, "Valid phone number is required"),
});

export const CreateOrderRequestSchema = z
  .object({
    serviceMode: z.enum(["DELIVERY", "PICKUP"]),
    branchId: z.string().min(1, "Branch selection is required"),
    customer: CustomerInfoSchema,
    deliveryAddress: DeliveryAddressInputSchema.optional(),
    items: z.array(CartItemSchema).min(1, "Order must contain at least one item"),
    paymentMethod: z.enum(["CARD", "CASH"]).optional(),
    couponCode: z.string().trim().optional(),
    notes: z.string().max(300).optional(),
  })
  .refine(
    (data) => {
      if (data.serviceMode === "DELIVERY" && !data.deliveryAddress) {
        return false;
      }
      return true;
    },
    {
      message: "Delivery address is required when service mode is DELIVERY",
      path: ["deliveryAddress"],
    }
  );

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
