import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { orderService, type OrderStatus } from "@/server/domains/ordering/order-service";
import { requireStaffSession, validateOrderStatusTransition } from "@/lib/auth/server-guard";
import { AppError } from "@/lib/errors/app-error";

const StatusUpdateSchema = z.object({
  status: z.enum([
    "CONFIRMED",
    "ACCEPTED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "REJECTED",
    "CANCELLED",
  ]),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Authoritative Backend Authentication
    const session = await requireStaffSession(request);

    // 2. Fetch target order and verify existence
    const order = await orderService.getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Order '${id}' not found.` } },
        { status: 404 }
      );
    }

    // 3. Validate request payload
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

    const parsed = StatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status transition payload.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    // 4. Authoritative Role & Branch Authorization Guard (Mitigates BFLA & BOLA)
    validateOrderStatusTransition(session, order, parsed.data.status as OrderStatus);

    // 5. Execute state transition
    const updated = await orderService.transitionStatus(
      id,
      parsed.data.status as OrderStatus,
      parsed.data.note
    );

    return NextResponse.json({
      success: true,
      data: updated,
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

    console.error("[Admin Order Status Error]", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update order status.",
        },
      },
      { status: 500 }
    );
  }
}
