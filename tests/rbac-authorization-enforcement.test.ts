import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  type StaffSession,
  isRoleAuthorized,
  encodeStaffSession,
  decodeStaffSession,
} from "../src/lib/auth/session";
import {
  validateOrderStatusTransition,
  requireStaffSession,
  requireCapability,
} from "../src/lib/auth/server-guard";
import type { StoredOrder } from "../src/server/domains/ordering/order-service";
import { POST as statusPostHandler } from "../src/app/api/v1/admin/orders/[id]/status/route";
import { POST as menuPostHandler } from "../src/app/api/v1/admin/menu/route";

describe("RBAC and Backend Authorization Invariants (Bug Fix Verification)", () => {
  const staffSession: StaffSession = {
    userId: "usr-staff-1",
    fullName: "Dave Wilson",
    email: "staff@smashsizzle.com",
    role: "STAFF",
    branchId: "branch-1",
    branchName: "Downtown Flagship",
    expiresAt: Date.now() + 100000,
  };

  const kitchenSession: StaffSession = {
    userId: "usr-chef-1",
    fullName: "Chef Marco",
    email: "chef@smashsizzle.com",
    role: "KITCHEN_OPERATOR",
    branchId: "branch-1",
    branchName: "Downtown Flagship",
    expiresAt: Date.now() + 100000,
  };

  const adminSession: StaffSession = {
    userId: "usr-admin-1",
    fullName: "Alex Morgan",
    email: "admin@smashsizzle.com",
    role: "ADMIN",
    branchId: "all",
    branchName: "All Flagship Branches",
    expiresAt: Date.now() + 100000,
  };

  const mockOrder: StoredOrder = {
    id: "ord-test-101",
    orderNumber: "FF-10492",
    trackingToken: "token_mock_test_123",
    guestName: "John Doe",
    guestEmail: "john@example.com",
    guestPhone: "555-1234",
    branchId: "branch-1",
    serviceMode: "DELIVERY",
    status: "CONFIRMED",
    subtotalMinor: 2000,
    discountMinor: 0,
    deliveryFeeMinor: 300,
    taxMinor: 200,
    totalMinor: 2500,
    items: [],
    statusHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("proves STAFF role lacks KITCHEN_TERMINAL, MENU_WRITE, and AUDIT_VIEW capabilities", () => {
    expect(isRoleAuthorized("STAFF", "KITCHEN_TERMINAL")).toBe(false);
    expect(isRoleAuthorized("STAFF", "MENU_WRITE")).toBe(false);
    expect(isRoleAuthorized("STAFF", "AUDIT_VIEW")).toBe(false);
  });

  it("proves KITCHEN_OPERATOR has KITCHEN_TERMINAL capability but lacks MENU_WRITE and AUDIT_VIEW", () => {
    expect(isRoleAuthorized("KITCHEN_OPERATOR", "KITCHEN_TERMINAL")).toBe(true);
    expect(isRoleAuthorized("KITCHEN_OPERATOR", "MENU_WRITE")).toBe(false);
    expect(isRoleAuthorized("KITCHEN_OPERATOR", "AUDIT_VIEW")).toBe(false);
  });

  it("strictly BLOCKS STAFF from performing kitchen prep status transitions (PREPARING, READY)", () => {
    // 1. STAFF attempting to advance order to PREPARING must throw 403 Forbidden
    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "PREPARING")
    ).toThrowError(/not authorized to perform kitchen preparation/);

    // 2. STAFF attempting to advance order to READY must throw 403 Forbidden
    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "READY")
    ).toThrowError(/not authorized to perform kitchen preparation/);

    // 3. STAFF attempting to ACCEPT incoming kitchen order must throw 403 Forbidden
    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "ACCEPTED")
    ).toThrowError(/not authorized to perform kitchen preparation/);
  });

  it("PERMITS KITCHEN_OPERATOR and ADMIN to advance kitchen prep transitions", () => {
    expect(() =>
      validateOrderStatusTransition(kitchenSession, mockOrder, "PREPARING")
    ).not.toThrow();

    expect(() =>
      validateOrderStatusTransition(kitchenSession, mockOrder, "READY")
    ).not.toThrow();

    expect(() =>
      validateOrderStatusTransition(adminSession, mockOrder, "PREPARING")
    ).not.toThrow();
  });

  it("PERMITS STAFF to perform dispatch handoff transitions (OUT_FOR_DELIVERY, DELIVERED)", () => {
    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "OUT_FOR_DELIVERY")
    ).not.toThrow();

    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "DELIVERED")
    ).not.toThrow();
  });

  it("BLOCKS STAFF and KITCHEN_OPERATOR from cancelling or rejecting orders without management clearance", () => {
    expect(() =>
      validateOrderStatusTransition(staffSession, mockOrder, "CANCELLED")
    ).toThrowError(/lacks administrative authority to cancel/);

    expect(() =>
      validateOrderStatusTransition(kitchenSession, mockOrder, "REJECTED")
    ).toThrowError(/lacks administrative authority to cancel/);

    // Admin is allowed
    expect(() =>
      validateOrderStatusTransition(adminSession, mockOrder, "CANCELLED")
    ).not.toThrow();
  });

  it("enforces BOLA / branch isolation: STAFF cannot mutate orders in other branches", () => {
    const foreignBranchOrder: StoredOrder = {
      ...mockOrder,
      branchId: "branch-99-uptown",
    };

    expect(() =>
      validateOrderStatusTransition(staffSession, foreignBranchOrder, "DELIVERED")
    ).toThrowError(/Cross-branch operation denied/);

    // Admin with branchId='all' is exempt from single-branch restriction
    expect(() =>
      validateOrderStatusTransition(adminSession, foreignBranchOrder, "DELIVERED")
    ).not.toThrow();
  });

  it("validates session decoding and token expiration", () => {
    const token = encodeStaffSession(staffSession);
    const decoded = decodeStaffSession(token);
    expect(decoded?.userId).toBe(staffSession.userId);
    expect(decoded?.role).toBe("STAFF");

    // Expired token returns null
    const expiredSession: StaffSession = {
      ...staffSession,
      expiresAt: Date.now() - 1000,
    };
    const expiredToken = encodeStaffSession(expiredSession);
    expect(decodeStaffSession(expiredToken)).toBeNull();
  });

  /* Route Handler HTTP Authorization Integration Tests */

  it("API /api/v1/admin/orders/[id]/status: rejects unauthenticated requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/v1/admin/orders/ord-test-101/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PREPARING" }),
    });

    const res = await statusPostHandler(req, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error?.code).toBe("UNAUTHORIZED");
  });

  it("API /api/v1/admin/orders/[id]/status: rejects STAFF performing kitchen PREPARING transition with 403 Forbidden", async () => {
    const token = encodeStaffSession(staffSession);
    const req = new NextRequest("http://localhost:3000/api/v1/admin/orders/ord-test-101/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `ss_staff_session=${token}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });

    const res = await statusPostHandler(req, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("FORBIDDEN");
    expect(body.error?.message).toContain("not authorized to perform kitchen preparation");
  });

  it("API /api/v1/admin/orders/[id]/status: allows KITCHEN_OPERATOR performing kitchen PREPARING transition with 200", async () => {
    const token = encodeStaffSession(kitchenSession);
    const req = new NextRequest("http://localhost:3000/api/v1/admin/orders/ord-test-101/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `ss_staff_session=${token}`,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    });

    const res = await statusPostHandler(req, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe("PREPARING");
  });

  it("API /api/v1/admin/menu: rejects unauthenticated or low-privilege (STAFF) creation requests with 401/403", async () => {
    // 1. Unauthenticated -> 401
    const unauthReq = new Request("http://localhost:3000/api/v1/admin/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauthorized Burger",
        description: "Delicious attempt to bypass RBAC",
        basePriceMinor: 1299,
        categoryId: "cat-1",
      }),
    });
    const resUnauth = await menuPostHandler(unauthReq);
    expect(resUnauth.status).toBe(401);

    // 2. Authenticated as STAFF -> 403 Forbidden
    const staffToken = encodeStaffSession(staffSession);
    const staffReq = new Request("http://localhost:3000/api/v1/admin/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: `ss_staff_session=${staffToken}`,
      },
      body: JSON.stringify({
        name: "Staff Unauthorized Burger",
        description: "Delicious attempt to bypass RBAC",
        basePriceMinor: 1299,
        categoryId: "cat-1",
      }),
    });
    const resStaff = await menuPostHandler(staffReq);
    expect(resStaff.status).toBe(403);
  });
});
