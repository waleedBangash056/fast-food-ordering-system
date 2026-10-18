import { NextRequest, NextResponse } from "next/server";
import { CartValidationRequestSchema } from "@/lib/validation/cart.schema";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { calculateOrderTotals } from "@/lib/pricing/calculator";
import { AppError } from "@/lib/errors/app-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CartValidationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid cart validation request.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { items, serviceMode, couponCode } = parsed.data;

    // 1. Resolve and validate items against authoritative server catalog
    const resolvedItems = await catalogService.resolveAuthoritativeOrderItems(items);

    // 2. Recalculate authoritatively
    const calculationItems = resolvedItems.map((item) => {
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

    // Subtotal before coupon
    const initialTotals = calculateOrderTotals({
      serviceMode,
      items: calculationItems,
    });

    let discountMinor = 0;
    let appliedCoupon: { code: string; description: string; discountMinor: number } | null = null;

    if (couponCode) {
      try {
        const couponResult = await catalogService.validateCoupon(
          couponCode,
          initialTotals.subtotalMinor
        );
        discountMinor = couponResult.discountMinor;
        appliedCoupon = {
          code: couponResult.code,
          description: couponResult.description,
          discountMinor: couponResult.discountMinor,
        };
      } catch (err: any) {
        if (err instanceof AppError) {
          return NextResponse.json(
            {
              error: {
                code: err.code || "INVALID_COUPON",
                message: err.message,
              },
            },
            { status: err.statusCode || 400 }
          );
        }
        throw err;
      }
    }

    const finalTotals = calculateOrderTotals({
      serviceMode,
      items: calculationItems,
      discountMinor,
    });

    return NextResponse.json({
      data: {
        isValid: true,
        totals: finalTotals,
        appliedCoupon,
        items: resolvedItems,
      },
    });
  } catch (error: any) {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const errorCode = isAppError ? error.code : "INTERNAL_SERVER_ERROR";
    if (!isAppError) {
      console.error("[cart/validate] Unexpected error:", error);
    }
    return NextResponse.json(
      {
        error: {
          code: errorCode,
          message: isAppError ? error.message : "Failed to validate cart.",
        },
      },
      { status: statusCode }
    );
  }
}

