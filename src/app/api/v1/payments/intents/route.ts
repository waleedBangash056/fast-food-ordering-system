import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { paymentService, isMockPaymentAllowed } from "@/server/domains/payments/payment-provider";

const IntentRequestSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  provider: z.enum(["STRIPE", "MOCK"]).optional(),
  trackingToken: z.string().optional(),
  simulateCaptureInSandbox: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = IntentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid payment intent parameters.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const defaultProvider = isMockPaymentAllowed() ? "MOCK" : "STRIPE";
    const provider = parsed.data.provider ?? defaultProvider;

    const result = await paymentService.createPaymentIntent(
      parsed.data.orderId,
      provider,
      {
        trackingToken: parsed.data.trackingToken,
        simulateCaptureInSandbox: parsed.data.simulateCaptureInSandbox,
      }
    );

    return NextResponse.json({
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create payment intent.",
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

