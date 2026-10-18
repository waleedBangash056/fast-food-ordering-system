import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/server/domains/payments/payment-provider";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const signature =
      request.headers.get("stripe-signature") ||
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-signature");

    const rawBody = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_PAYLOAD",
            message: "Webhook body must be valid JSON.",
          },
        },
        { status: 400 }
      );
    }

    const result = await paymentService.processWebhook(provider, signature, body, rawBody);

    return NextResponse.json({
      received: true,
      processed: result.processed,
      deduplicated: result.deduplicated,
      orderId: result.orderId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Webhook processing failed.",
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

