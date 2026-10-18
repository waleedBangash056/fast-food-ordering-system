import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/server/domains/ordering/order-service";
import { getStaffSession } from "@/lib/auth/server-guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trackingToken =
      request.headers.get("x-tracking-token") ||
      request.nextUrl.searchParams.get("token") ||
      undefined;

    const order = await orderService.getOrderById(id);
    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Order '${id}' not found.` } },
        { status: 404 }
      );
    }

    const staffSession = await getStaffSession(request);

    if (trackingToken) {
      if (trackingToken !== order.trackingToken) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Invalid tracking token for this order." } },
          { status: 403 }
        );
      }
    } else if (staffSession) {
      if (
        staffSession.role !== "ADMIN" &&
        staffSession.role !== "SUPER_ADMIN" &&
        staffSession.branchId !== "all" &&
        order.branchId !== staffSession.branchId
      ) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "Cross-branch order access denied.",
            },
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Order tracking token or operational staff session is required.",
          },
        },
        { status: 401 }
      );
    }

    if (!staffSession) {
      const { idempotencyKey: _idempotencyKey, trackingToken: _trackingToken, ...guestOrderView } =
        order;
      return NextResponse.json({
        data: guestOrderView,
      });
    }

    return NextResponse.json({
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: error.code || "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch order.",
        },
      },
      { status: error.statusCode || 500 }
    );
  }
}

