import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  authenticateStaffCredentials,
  isRoleAuthorized,
  type StaffRole,
} from "../src/lib/auth/session";
import { catalogService } from "../src/server/domains/catalog/catalog-service";
import { auditService } from "../src/server/domains/audit/audit-service";

describe("Admin Verification and Role-Based Access Control (Issue 1 and 2)", () => {
  it("verifies public footer does NOT expose administrative or KDS links to guests", () => {
    const footerPath = path.resolve("./src/components/navigation/footer.tsx");
    const footerContent = fs.readFileSync(footerPath, "utf-8");

    // The public storefront footer must not contain direct links to /admin or KDS
    expect(footerContent).not.toContain('href="/admin"');
    expect(footerContent).not.toContain("Kitchen Display System (KDS)");
  });

  it("authenticates staff credentials and returns correct role metadata", async () => {
    // 1. Valid Admin login
    const adminSession = await authenticateStaffCredentials("admin@smashsizzle.com", "admin123");
    expect(adminSession).not.toBeNull();
    expect(adminSession?.role).toBe("ADMIN");

    // 2. Valid Kitchen Operator PIN login
    const kitchenSession = await authenticateStaffCredentials("chef@smashsizzle.com", "1111");
    expect(kitchenSession).not.toBeNull();
    expect(kitchenSession?.role).toBe("KITCHEN_OPERATOR");

    // 3. Invalid credentials reject
    await expect(
      authenticateStaffCredentials("unknown@example.com", "wrongpass")
    ).rejects.toThrow();
  });

  it("strictly enforces role permissions for Menu Management vs Kitchen Terminal", () => {
    // Menu editing permissions: Only ADMIN and SUPER_ADMIN
    expect(isRoleAuthorized("ADMIN", "MENU_WRITE")).toBe(true);
    expect(isRoleAuthorized("SUPER_ADMIN", "MENU_WRITE")).toBe(true);
    expect(isRoleAuthorized("KITCHEN_OPERATOR", "MENU_WRITE")).toBe(false);
    expect(isRoleAuthorized("STAFF", "MENU_WRITE")).toBe(false);
    expect(isRoleAuthorized("CUSTOMER", "MENU_WRITE")).toBe(false);
    expect(isRoleAuthorized("GUEST", "MENU_WRITE")).toBe(false);

    // Kitchen terminal access permissions: KITCHEN_OPERATOR, BRANCH_MANAGER, ADMIN
    expect(isRoleAuthorized("KITCHEN_OPERATOR", "KITCHEN_TERMINAL")).toBe(true);
    expect(isRoleAuthorized("BRANCH_MANAGER", "KITCHEN_TERMINAL")).toBe(true);
    expect(isRoleAuthorized("ADMIN", "KITCHEN_TERMINAL")).toBe(true);
    expect(isRoleAuthorized("CUSTOMER", "KITCHEN_TERMINAL")).toBe(false);
    expect(isRoleAuthorized("GUEST", "KITCHEN_TERMINAL")).toBe(false);
  });

  it("allows authorized ADMIN to add new menu item and records immutable audit log", async () => {
    const initialItemCount = (await catalogService.getMenuItems()).length;
    const initialAuditCount = auditService.getAuditEvents().length;

    const newItem = await catalogService.createMenuItem({
      name: "Truffle Umami Double Smash",
      description: "Two 3.5oz dry-aged beef patties, white truffle glaze, sauteed king trumpet mushrooms, aged provolone on toasted sesame brioche.",
      basePriceMinor: 1699,
      categoryId: "cat-1",
      prepTimeMinutes: 8,
      calories: 820,
      isHalal: true,
      isGlutenFree: false,
      isVegan: false,
      isVegetarian: false,
      isSpicy: false,
      actorRole: "ADMIN",
      actorId: "usr-admin-1",
    });

    expect(newItem.id).toBeDefined();
    expect(newItem.slug).toBe("truffle-umami-double-smash");
    expect(newItem.basePriceMinor).toBe(1699);

    // Verify catalog reflects the new item
    const updatedItems = await catalogService.getMenuItems();
    expect(updatedItems.length).toBe(initialItemCount + 1);

    //  Verify audit log captured the mutation
    const auditLogs = auditService.getAuditEvents();
    expect(auditLogs.length).toBeGreaterThan(initialAuditCount);
    const log = auditLogs.find((l) => l.entityId === newItem.id);
    expect(log).toBeDefined();
    expect(log?.action).toBe("MENU_ITEM_CREATED");
    expect(log?.actorRole).toBe("ADMIN");
  });

  it("allows authorized ADMIN to toggle item stock availability", async () => {
    const items = await catalogService.getMenuItems();
    const targetItem = items[0];
    const initialAvailability = targetItem.isAvailable ?? true;

    const updated = await catalogService.updateMenuItemAvailability(
      targetItem.id,
      !initialAvailability,
      "ADMIN",
      "usr-admin-1"
    );

    expect(updated.isAvailable).toBe(!initialAvailability);

    // Revert for cleanliness
    await catalogService.updateMenuItemAvailability(
      targetItem.id,
      initialAvailability,
      "ADMIN",
      "usr-admin-1"
    );
  });
});