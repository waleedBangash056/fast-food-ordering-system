import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import {
  decodeStaffSession,
  isRoleAuthorized,
  type StaffRole,
  type StaffSession,
} from "./session";
import { AppError } from "@/lib/errors/app-error";
import type { OrderStatus, StoredOrder } from "@/server/domains/ordering/order-service";

/**
 * Extracts staff session from NextRequest cookies, standard Request Cookie header,
 * or server next/headers cookie store.
 */
export async function getStaffSession(req?: NextRequest | Request): Promise<StaffSession | null> {
  let token: string | undefined;

  // 1. NextRequest cookie map
  if (req && "cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token = (req as NextRequest).cookies.get("ss_staff_session")?.value;
  }

  // 2. Standard Request Cookie header
  if (!token && req && req.headers) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/ss_staff_session=([^;]+)/);
      if (match) token = match[1];
    }
  }

  // 3. Fallback to next/headers cookies() in server components / route handlers
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("ss_staff_session")?.value;
    } catch {
      // Cookies store not accessible in isolated unit test
    }
  }

  if (!token) return null;
  return decodeStaffSession(token);
}

/**
 * Enforces that a valid staff session exists or throws 401 Unauthorized.
 */
export async function requireStaffSession(req?: NextRequest | Request): Promise<StaffSession> {
  const session = await getStaffSession(req);
  if (!session) {
    throw new AppError(
      "UNAUTHORIZED",
      "Operational staff authentication required. Access denied.",
      401
    );
  }
  return session;
}

/**
 * Enforces that the authenticated session possesses the required capability or throws 403 Forbidden.
 */
export async function requireCapability(
  capability: string,
  req?: NextRequest | Request
): Promise<StaffSession> {
  const session = await requireStaffSession(req);
  if (!isRoleAuthorized(session.role, capability)) {
    throw new AppError(
      "FORBIDDEN",
      `Role '${session.role}' lacks clearance for capability '${capability}'. Access denied.`,
      403
    );
  }
  return session;
}

/**
 * Validates whether the given staff session role is authorized to transition an order to targetStatus.
 * - Kitchen prep transitions ('ACCEPTED', 'PREPARING', 'READY') STRICTLY require KITCHEN_TERMINAL capability.
 * - Front counter dispatch transitions ('OUT_FOR_DELIVERY', 'DELIVERED') require ORDER_STATUS_UPDATE capability.
 * - Cancellations ('REJECTED', 'CANCELLED', 'REFUNDED') require management clearance (BRANCH_MANAGER, ADMIN).
 * - Enforces Branch Tenant Isolation (BOLA) preventing cross-branch order manipulation.
 */
export function validateOrderStatusTransition(
  session: StaffSession,
  order: StoredOrder,
  targetStatus: OrderStatus
): void {
  // 1. Branch tenant isolation (BOLA check)
  if (
    session.role !== "ADMIN" &&
    session.role !== "SUPER_ADMIN" &&
    session.branchId !== "all" &&
    order.branchId !== session.branchId
  ) {
    throw new AppError(
      "FORBIDDEN",
      `Cross-branch operation denied. Session branch '${session.branchId}' cannot mutate order in branch '${order.branchId}'.`,
      403
    );
  }

  // 2. Manual confirmation of a PAID order: requires KITCHEN_TERMINAL or BRANCH_MANAGER/ADMIN
  if (targetStatus === "CONFIRMED") {
    if (!isRoleAuthorized(session.role, "KITCHEN_TERMINAL")) {
      throw new AppError(
        "FORBIDDEN",
        `Role '${session.role}' is not authorized to confirm orders.`,
        403
      );
    }
    return;
  }

  // 3. Kitchen preparation stations: STRICTLY requires KITCHEN_TERMINAL capability
  const KITCHEN_PREP_STATES: OrderStatus[] = ["ACCEPTED", "PREPARING", "READY"];
  if (KITCHEN_PREP_STATES.includes(targetStatus)) {
    if (!isRoleAuthorized(session.role, "KITCHEN_TERMINAL")) {
      throw new AppError(
        "FORBIDDEN",
        `Role '${session.role}' is not authorized to perform kitchen preparation transitions. Kitchen terminal clearance required.`,
        403
      );
    }
    return;
  }

  // 4. Dispatch / Handoff states: requires ORDER_STATUS_UPDATE
  const DISPATCH_STATES: OrderStatus[] = ["OUT_FOR_DELIVERY", "DELIVERED"];
  if (DISPATCH_STATES.includes(targetStatus)) {
    if (!isRoleAuthorized(session.role, "ORDER_STATUS_UPDATE")) {
      throw new AppError(
        "FORBIDDEN",
        `Role '${session.role}' is not authorized to update dispatch status.`,
        403
      );
    }
    return;
  }

  // 5. Cancellation or Rejection: requires management clearance
  const CANCELLATION_STATES: OrderStatus[] = ["REJECTED", "CANCELLED", "REFUNDED"];
  if (CANCELLATION_STATES.includes(targetStatus)) {
    if (!["BRANCH_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(session.role)) {
      throw new AppError(
        "FORBIDDEN",
        `Role '${session.role}' lacks administrative authority to cancel or reject orders.`,
        403
      );
    }
    return;
  }

  // Default deny for any other targetStatus (e.g., DRAFT, PENDING_PAYMENT, PAID)
  throw new AppError(
    "FORBIDDEN",
    `Role '${session.role}' is not authorized to transition order to '${targetStatus}'.`,
    403
  );
}

