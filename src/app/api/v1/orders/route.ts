import { NextRequest, NextResponse } from "next/server";
import { CreateOrderRequestSchema } from "@/lib/validation/order.schema";
import { orderService } from "@/server/domains/ordering/order-service";

export async function POST(request: NextRequest) {
  try {
    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Malformed JSON payload in request body.",
          },
        },
        { status: 400 }
      );
    }

    const parsed = CreateOrderRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Order request failed validation.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const order = await orderService.createOrder(parsed.data, idempotencyKey);

    return NextResponse.json(
      {
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          trackingToken: order.trackingToken,
          status: order.status,
          totals: {
            subtotalMinor: order.subtotalMinor,
            discountMinor: order.discountMinor,
            deliveryFeeMinor: order.deliveryFeeMinor,
            taxMinor: order.taxMinor,
            totalMinor: order.totalMinor,
          },
          createdAt: order.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to place order.",
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

import { requireStaffSession } from "@/lib/auth/server-guard";

export async function GET(request: NextRequest) {
  try {
    const session = await requireStaffSession(request);
    const allOrders = await orderService.getAllOrders();

    const scopedOrders =
      session.role === "ADMIN" ||
      session.role === "SUPER_ADMIN" ||
      session.branchId === "all"
        ? allOrders
        : allOrders.filter((o) => o.branchId === session.branchId);

    return NextResponse.json({
      data: scopedOrders,
      meta: { total: scopedOrders.length },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch orders.",
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

