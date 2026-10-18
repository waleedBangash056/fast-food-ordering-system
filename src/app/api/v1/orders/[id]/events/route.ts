import { NextRequest } from "next/server";
import { orderService } from "@/server/domains/ordering/order-service";
import { getStaffSession } from "@/lib/auth/server-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token =
    request.headers.get("x-tracking-token") ||
    request.nextUrl.searchParams.get("token") ||
    undefined;

  const staffSession = await getStaffSession(request);
  if (!token && !staffSession) {
    return new Response("Order tracking token or staff session required", { status: 401 });
  }

  const order = await orderService.getOrderById(id);
  if (!order) {
    return new Response("Order not found or tracking token invalid", { status: 404 });
  }

  if (token) {
    if (token !== order.trackingToken) {
      // Uniform 404 prevents order ID enumeration via token probing
      return new Response("Order not found or tracking token invalid", { status: 404 });
    }
  } else if (staffSession) {
    if (
      staffSession.role !== "ADMIN" &&
      staffSession.role !== "SUPER_ADMIN" &&
      staffSession.branchId !== "all" &&
      order.branchId !== staffSession.branchId
    ) {
      return new Response("Cross-branch order access denied", { status: 403 });
    }
  }

  const encoder = new TextEncoder();

  let isClosed = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastSentUpdatedAt = order.updatedAt;

  const cleanup = (controller?: ReadableStreamDefaultController) => {
    if (isClosed) return;
    isClosed = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (controller) {
      try {
        controller.close();
      } catch {
        // Stream controller may already be closed or errored
      }
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state immediately
      const initialPayload = JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
        updatedAt: order.updatedAt,
      });
      controller.enqueue(encoder.encode(`event: order.status\ndata: ${initialPayload}\n\n`));

      // Self-scheduling poll loop: ensures previous query completes before next poll
      const poll = async () => {
        if (isClosed) return;
        try {
          const currentOrder = await orderService.getOrderById(id);
          if (!currentOrder) {
            cleanup(controller);
            return;
          }
          if (currentOrder.updatedAt !== lastSentUpdatedAt && !isClosed) {
            lastSentUpdatedAt = currentOrder.updatedAt;
            const data = JSON.stringify({
              orderId: currentOrder.id,
              orderNumber: currentOrder.orderNumber,
              status: currentOrder.status,
              statusHistory: currentOrder.statusHistory,
              updatedAt: currentOrder.updatedAt,
            });
            controller.enqueue(encoder.encode(`event: order.status\ndata: ${data}\n\n`));
          }
          if (!isClosed) {
            timeoutId = setTimeout(poll, 3000);
          }
        } catch {
          cleanup(controller);
        }
      };

      timeoutId = setTimeout(poll, 3000);

      request.signal.addEventListener("abort", () => {
        cleanup(controller);
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
