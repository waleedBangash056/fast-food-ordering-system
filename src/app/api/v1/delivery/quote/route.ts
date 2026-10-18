import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { AppError } from "@/lib/errors/app-error";

const DeliveryQuoteSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  streetAddress: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(3, "Postal code is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Malformed or missing JSON request body.",
          },
        },
        { status: 400 }
      );
    }

    const parsed = DeliveryQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid address fields for delivery quote.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { branchId, postalCode } = parsed.data;
    const branch = await catalogService.getBranchById(branchId);

    if (!branch) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Selected branch does not exist.",
          },
        },
        { status: 404 }
      );
    }

    // Check delivery serviceability rule
    // For demonstration, reject postal codes starting with "00" or length < 5 as out of zone
    if (postalCode.startsWith("00") || postalCode.length < 5) {
      return NextResponse.json(
        {
          error: {
            code: "DELIVERY_NOT_SERVICEABLE",
            message: "The specified delivery address is outside the active delivery zone for this branch.",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        isServiceable: true,
        branchId: branch.id,
        branchName: branch.name,
        deliveryFeeMinor: branch.deliveryFeeMinor,
        minOrderMinor: branch.minOrderMinor,
        estimatedDeliveryMinutes: 35,
        estimatedTimeRange: "30-40 min",
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error("[Delivery Quote Error]", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate delivery quote. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}

