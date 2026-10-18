import { asc, eq } from "drizzle-orm";
import { assertDatabaseReadyForRuntime, db, isDatabaseConfigured } from "@/lib/db";
import { categories, menuItems, branches, coupons } from "@/lib/db/schema";
import {
  SEED_CATEGORIES,
  SEED_MENU_ITEMS,
  SEED_BRANCHES,
  SEED_COUPONS,
  type SeedMenuItem,
  type SeedCategory,
  type SeedBranch,
  type SeedModifierGroup,
} from "@/lib/db/seed-data";
import { AppError } from "@/lib/errors/app-error";
import { auditService } from "@/server/domains/audit/audit-service";

function mapRowToMenuItem(row: typeof menuItems.$inferSelect): SeedMenuItem {
  const rawModifiers = Array.isArray(row.modifierGroupsJson)
    ? (row.modifierGroupsJson as SeedModifierGroup[])
    : undefined;
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    basePriceMinor: row.basePriceMinor,
    imageUrl: row.imageUrl,
    isAvailable: row.isAvailable,
    isFeatured: row.isFeatured,
    displayOrder: row.displayOrder,
    calories: row.calories ?? 0,
    prepTimeMinutes: row.prepTimeMinutes,
    isHalal: row.isHalal,
    isGlutenFree: row.isGlutenFree,
    isVegan: row.isVegan,
    isVegetarian: row.isVegetarian,
    isSpicy: row.isSpicy,
    modifierGroups: rawModifiers && rawModifiers.length > 0 ? rawModifiers : undefined,
  };
}

export interface OrderItemValidationInput {
  menuItemId: string;
  name: string;
  basePriceMinor: number;
  quantity: number;
  selectedModifiers: Record<
    string,
    Array<{
      id: string;
      name: string;
      priceDeltaMinor: number;
    }>
  >;
}

export class CatalogService {
  private items: SeedMenuItem[] = [...SEED_MENU_ITEMS];
  private branchState: Array<
    SeedBranch & { acceptOrders?: boolean; maxCapacityOrdersPerHour?: number }
  > = SEED_BRANCHES.map((b) => ({
    ...b,
    acceptOrders: true,
    maxCapacityOrdersPerHour: 40,
  }));

  async getCategories(): Promise<SeedCategory[]> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const rows = await db
        .select()
        .from(categories)
        .orderBy(asc(categories.displayOrder));
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description || "",
        imageUrl: r.imageUrl || "",
        displayOrder: r.displayOrder,
      }));
    }

    return [...SEED_CATEGORIES].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getCategoryBySlug(slug: string): Promise<SeedCategory | null> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [row] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description || "",
        imageUrl: row.imageUrl || "",
        displayOrder: row.displayOrder,
      };
    }

    const cat = SEED_CATEGORIES.find((c) => c.slug === slug);
    return cat || null;
  }

  async getMenuItems(options?: {
    categoryId?: string;
    categorySlug?: string;
    featuredOnly?: boolean;
  }): Promise<SeedMenuItem[]> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const rows = await db
        .select()
        .from(menuItems)
        .orderBy(asc(menuItems.displayOrder));
      let mapped = rows.map(mapRowToMenuItem);

      if (options?.categoryId) {
        mapped = mapped.filter((i) => i.categoryId === options.categoryId);
      } else if (options?.categorySlug) {
        const cat = await this.getCategoryBySlug(options.categorySlug);
        if (cat) {
          mapped = mapped.filter((i) => i.categoryId === cat.id);
        }
      }

      if (options?.featuredOnly) {
        mapped = mapped.filter((i) => i.isFeatured);
      }

      return mapped;
    }

    let items = [...this.items];

    if (options?.categoryId) {
      items = items.filter((i) => i.categoryId === options.categoryId);
    } else if (options?.categorySlug) {
      const cat = SEED_CATEGORIES.find((c) => c.slug === options.categorySlug);
      if (cat) {
        items = items.filter((i) => i.categoryId === cat.id);
      }
    }

    if (options?.featuredOnly) {
      items = items.filter((i) => i.isFeatured);
    }

    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getMenuItemById(id: string): Promise<SeedMenuItem | null> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [row] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);
      return row ? mapRowToMenuItem(row) : null;
    }

    const item = this.items.find((i) => i.id === id);
    return item || null;
  }

  async getMenuItemBySlug(slug: string): Promise<SeedMenuItem | null> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [row] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.slug, slug))
        .limit(1);
      return row ? mapRowToMenuItem(row) : null;
    }

    const item = this.items.find((i) => i.slug === slug);
    return item || null;
  }

  /**
   * Resolves and validates order/cart items against the authoritative server catalog.
   * Prevents client-side price tampering, sold-out item ordering, forged/wrong-group/inactive modifiers,
   * and enforces modifier group selection rules (isRequired, minSelections, maxSelections, selectionType).
   */
  async resolveAuthoritativeOrderItems(
    items: OrderItemValidationInput[]
  ): Promise<OrderItemValidationInput[]> {
    assertDatabaseReadyForRuntime();

    const resolved: OrderItemValidationInput[] = [];

    for (const item of items) {
      const catalogItem = await this.getMenuItemById(item.menuItemId);
      if (!catalogItem) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Menu item '${item.menuItemId}' does not exist in the catalog.`,
          400
        );
      }

      if (catalogItem.isAvailable === false) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Menu item '${catalogItem.name}' is currently sold out.`,
          400
        );
      }

      if (item.basePriceMinor !== catalogItem.basePriceMinor) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Price mismatch for '${catalogItem.name}': client sent ${item.basePriceMinor}, authoritative catalog price is ${catalogItem.basePriceMinor}.`,
          400
        );
      }

      const catalogGroups: SeedModifierGroup[] = catalogItem.modifierGroups ?? [];
      const groupsByKey = new Map<string, SeedModifierGroup>();
      const allOptionsToGroup = new Map<string, SeedModifierGroup>();

      for (const grp of catalogGroups) {
        groupsByKey.set(grp.name.toLowerCase(), grp);
        groupsByKey.set(grp.id.toLowerCase(), grp);
        for (const opt of grp.options) {
          allOptionsToGroup.set(opt.id, grp);
        }
      }

      const validatedModifiers: OrderItemValidationInput["selectedModifiers"] = {};
      const seenGroupIds = new Set<string>();

      for (const [submittedGroupKey, submittedOptions] of Object.entries(
        item.selectedModifiers || {}
      )) {
        const catalogGroup = groupsByKey.get(submittedGroupKey.trim().toLowerCase());
        if (!catalogGroup) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Unknown modifier group '${submittedGroupKey}' for menu item '${catalogItem.name}'.`,
            400
          );
        }

        if (seenGroupIds.has(catalogGroup.id)) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Duplicate modifier group '${catalogGroup.name}' submitted for '${catalogItem.name}'.`,
            400
          );
        }
        seenGroupIds.add(catalogGroup.id);

        if (!Array.isArray(submittedOptions)) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Invalid modifier options list for group '${catalogGroup.name}'.`,
            400
          );
        }

        const groupOptionsById = new Map(
          catalogGroup.options.map((opt) => [opt.id, opt])
        );
        const seenOptionIds = new Set<string>();

        validatedModifiers[catalogGroup.name] = submittedOptions.map((opt) => {
          if (typeof opt.priceDeltaMinor !== "number" || opt.priceDeltaMinor < 0) {
            throw new AppError(
              "VALIDATION_ERROR",
              `Invalid negative modifier price delta for '${opt.name}'.`,
              400
            );
          }

          const catalogOption = groupOptionsById.get(opt.id);
          if (!catalogOption) {
            const belongsToOtherGroup = allOptionsToGroup.get(opt.id);
            if (belongsToOtherGroup) {
              throw new AppError(
                "VALIDATION_ERROR",
                `Modifier option '${opt.id}' belongs to group '${belongsToOtherGroup.name}', not '${catalogGroup.name}'.`,
                400
              );
            }
            throw new AppError(
              "VALIDATION_ERROR",
              `Unknown or forged modifier option '${opt.id}' in group '${catalogGroup.name}' for '${catalogItem.name}'.`,
              400
            );
          }

          if (catalogOption.isActive === false || catalogOption.isAvailable === false) {
            throw new AppError(
              "VALIDATION_ERROR",
              `Modifier option '${catalogOption.name}' in group '${catalogGroup.name}' is currently inactive or unavailable.`,
              400
            );
          }

          if (seenOptionIds.has(catalogOption.id)) {
            throw new AppError(
              "VALIDATION_ERROR",
              `Duplicate modifier option '${catalogOption.name}' in group '${catalogGroup.name}'.`,
              400
            );
          }
          seenOptionIds.add(catalogOption.id);

          if (opt.priceDeltaMinor !== catalogOption.priceDeltaMinor) {
            throw new AppError(
              "VALIDATION_ERROR",
              `Modifier price mismatch for '${catalogOption.name}': client sent ${opt.priceDeltaMinor}, authoritative price delta is ${catalogOption.priceDeltaMinor}.`,
              400
            );
          }

          return {
            id: catalogOption.id,
            name: catalogOption.name,
            priceDeltaMinor: catalogOption.priceDeltaMinor,
          };
        });
      }

      // Enforce each catalog group's isRequired, minSelections, maxSelections, and SINGLE/MULTIPLE rules
      for (const catalogGroup of catalogGroups) {
        const selectedForGroup = validatedModifiers[catalogGroup.name] ?? [];
        const selectionCount = selectedForGroup.length;

        const minRequired = catalogGroup.isRequired
          ? Math.max(1, catalogGroup.minSelections)
          : Math.max(0, catalogGroup.minSelections);
        const maxAllowed =
          catalogGroup.selectionType === "SINGLE"
            ? Math.min(1, catalogGroup.maxSelections > 0 ? catalogGroup.maxSelections : 1)
            : catalogGroup.maxSelections;

        if (selectionCount < minRequired) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Modifier group '${catalogGroup.name}' for '${catalogItem.name}' requires at least ${minRequired} selection(s), but received ${selectionCount}.`,
            400
          );
        }

        if (maxAllowed > 0 && selectionCount > maxAllowed) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Modifier group '${catalogGroup.name}' for '${catalogItem.name}' allows at most ${maxAllowed} selection(s), but received ${selectionCount}.`,
            400
          );
        }
      }

      resolved.push({
        menuItemId: catalogItem.id,
        name: catalogItem.name,
        basePriceMinor: catalogItem.basePriceMinor,
        quantity: item.quantity,
        selectedModifiers: validatedModifiers,
      });
    }

    return resolved;
  }

  async createMenuItem(data: {
    name: string;
    description: string;
    basePriceMinor: number;
    categoryId: string;
    imageUrl?: string;
    prepTimeMinutes?: number;
    calories?: number;
    isHalal?: boolean;
    isGlutenFree?: boolean;
    isVegan?: boolean;
    isVegetarian?: boolean;
    isSpicy?: boolean;
    actorRole?: string;
    actorId?: string;
  }): Promise<SeedMenuItem> {
    assertDatabaseReadyForRuntime();

    if (!data.name || data.name.trim().length === 0) {
      throw new AppError("VALIDATION_ERROR", "Item name is required.", 400);
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new AppError("VALIDATION_ERROR", "Item description is required.", 400);
    }
    if (!data.categoryId) {
      throw new AppError("VALIDATION_ERROR", "Item categoryId is required.", 400);
    }
    if (data.basePriceMinor <= 0) {
      throw new AppError("VALIDATION_ERROR", "Base price must be greater than zero.", 400);
    }

    const availableCategories = await this.getCategories();
    const categoryExists = availableCategories.some((c) => c.id === data.categoryId);
    if (!categoryExists) {
      throw new AppError("VALIDATION_ERROR", `Category with id '${data.categoryId}' does not exist.`, 400);
    }

    let slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!slug) {
      slug = `item-${crypto.randomUUID().slice(0, 8)}`;
    } else {
      const existingSlug = this.items.some((i) => i.slug === slug);
      if (existingSlug) {
        slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;
      }
    }

    const newItem: SeedMenuItem = {
      id: `item-${crypto.randomUUID()}`,
      name: data.name.trim(),
      slug,
      description: data.description.trim(),
      basePriceMinor: data.basePriceMinor,
      categoryId: data.categoryId,
      imageUrl:
        data.imageUrl ||
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
      prepTimeMinutes: data.prepTimeMinutes ?? 10,
      calories: data.calories ?? 650,
      isAvailable: true,
      isFeatured: false,
      displayOrder: this.items.length + 1,
      isHalal: data.isHalal ?? false,
      isGlutenFree: data.isGlutenFree ?? false,
      isVegan: data.isVegan ?? false,
      isVegetarian: data.isVegetarian ?? false,
      isSpicy: data.isSpicy ?? false,
    };

    if (isDatabaseConfigured()) {
      await db.insert(menuItems).values({
        id: newItem.id,
        categoryId: newItem.categoryId,
        name: newItem.name,
        slug: newItem.slug,
        description: newItem.description,
        basePriceMinor: newItem.basePriceMinor,
        imageUrl: newItem.imageUrl,
        isAvailable: true,
        isFeatured: false,
        displayOrder: newItem.displayOrder,
        calories: newItem.calories,
        prepTimeMinutes: newItem.prepTimeMinutes,
        isHalal: newItem.isHalal ?? false,
        isGlutenFree: newItem.isGlutenFree ?? false,
        isVegan: newItem.isVegan ?? false,
        isVegetarian: newItem.isVegetarian ?? false,
        isSpicy: newItem.isSpicy ?? false,
        modifierGroupsJson: [],
      });
    } else {
      this.items.push(newItem);
    }

    await auditService.recordAuditEvent({
      actorId: data.actorId || "usr-admin-1",
      actorRole: data.actorRole || "ADMIN",
      action: "MENU_ITEM_CREATED",
      entityType: "MENU_ITEM",
      entityId: newItem.id,
      details: `Created menu item '${newItem.name}' ($${(newItem.basePriceMinor / 100).toFixed(2)})`,
    });

    return newItem;
  }

  async updateMenuItem(
    id: string,
    updates: { isAvailable?: boolean; basePriceMinor?: number },
    actorRole: string = "ADMIN",
    actorId: string = "usr-admin-1"
  ): Promise<SeedMenuItem> {
    assertDatabaseReadyForRuntime();

    if (updates.basePriceMinor !== undefined && updates.basePriceMinor <= 0) {
      throw new AppError("VALIDATION_ERROR", "Base price must be greater than zero.", 400);
    }

    if (isDatabaseConfigured()) {
      const [existingRow] = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, id))
        .limit(1);

      if (!existingRow) {
        throw new AppError("NOT_FOUND", `Menu item with id ${id} not found.`, 404);
      }

      const setPayload: Record<string, any> = {};
      if (updates.isAvailable !== undefined) {
        setPayload.isAvailable = updates.isAvailable;
      }
      if (updates.basePriceMinor !== undefined) {
        setPayload.basePriceMinor = updates.basePriceMinor;
      }

      const [updatedRow] = await db
        .update(menuItems)
        .set(setPayload)
        .where(eq(menuItems.id, id))
        .returning();

      if (!updatedRow) {
        throw new AppError("NOT_FOUND", `Menu item with id ${id} not found.`, 404);
      }

      const mapped = mapRowToMenuItem(updatedRow);

      if (updates.isAvailable !== undefined) {
        await auditService.recordAuditEvent({
          actorId,
          actorRole,
          action: updates.isAvailable ? "MENU_ITEM_RESTOCKED" : "MENU_ITEM_MARKED_SOLD_OUT",
          entityType: "MENU_ITEM",
          entityId: mapped.id,
          details: `Updated availability of '${mapped.name}' to ${updates.isAvailable ? "IN_STOCK" : "SOLD_OUT"}`,
        });
      }

      if (updates.basePriceMinor !== undefined) {
        await auditService.recordAuditEvent({
          actorId,
          actorRole,
          action: "MENU_ITEM_PRICE_CHANGED",
          entityType: "MENU_ITEM",
          entityId: mapped.id,
          details: `Changed price of '${mapped.name}' from $${(existingRow.basePriceMinor / 100).toFixed(2)} to $${(updates.basePriceMinor / 100).toFixed(2)}`,
        });
      }

      return mapped;
    }

    const item = this.items.find((i) => i.id === id);
    if (!item) {
      throw new AppError("NOT_FOUND", `Menu item with id ${id} not found.`, 404);
    }

    const oldPrice = item.basePriceMinor;
    if (updates.isAvailable !== undefined) {
      item.isAvailable = updates.isAvailable;
      await auditService.recordAuditEvent({
        actorId,
        actorRole,
        action: updates.isAvailable ? "MENU_ITEM_RESTOCKED" : "MENU_ITEM_MARKED_SOLD_OUT",
        entityType: "MENU_ITEM",
        entityId: item.id,
        details: `Updated availability of '${item.name}' to ${updates.isAvailable ? "IN_STOCK" : "SOLD_OUT"}`,
      });
    }

    if (updates.basePriceMinor !== undefined) {
      item.basePriceMinor = updates.basePriceMinor;
      await auditService.recordAuditEvent({
        actorId,
        actorRole,
        action: "MENU_ITEM_PRICE_CHANGED",
        entityType: "MENU_ITEM",
        entityId: item.id,
        details: `Changed price of '${item.name}' from $${(oldPrice / 100).toFixed(2)} to $${(updates.basePriceMinor / 100).toFixed(2)}`,
      });
    }

    return item;
  }

  async updateMenuItemAvailability(
    id: string,
    isAvailable: boolean,
    actorRole: string = "ADMIN",
    actorId: string = "usr-admin-1"
  ): Promise<SeedMenuItem> {
    return this.updateMenuItem(id, { isAvailable }, actorRole, actorId);
  }

  async updateMenuItemPrice(
    id: string,
    newPriceMinor: number,
    actorRole: string = "ADMIN",
    actorId: string = "usr-admin-1"
  ): Promise<SeedMenuItem> {
    return this.updateMenuItem(id, { basePriceMinor: newPriceMinor }, actorRole, actorId);
  }

  async getBranches(): Promise<SeedBranch[]> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const rows = await db.select().from(branches);
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        address: r.address,
        phone: r.phone,
        email: r.email,
        latitude: String(r.latitude),
        longitude: String(r.longitude),
        deliveryFeeMinor: r.deliveryFeeMinor,
        minOrderMinor: r.minOrderMinor,
      }));
    }

    return [...this.branchState];
  }

  async getBranchById(id: string): Promise<SeedBranch | null> {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [row] = await db
        .select()
        .from(branches)
        .where(eq(branches.id, id))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        address: row.address,
        phone: row.phone,
        email: row.email,
        latitude: String(row.latitude),
        longitude: String(row.longitude),
        deliveryFeeMinor: row.deliveryFeeMinor,
        minOrderMinor: row.minOrderMinor,
      };
    }

    return this.branchState.find((b) => b.id === id) || null;
  }

  async updateBranchSettings(
    id: string,
    updates: { acceptOrders?: boolean; maxCapacityOrdersPerHour?: number },
    actorRole: string = "BRANCH_MANAGER",
    actorId: string = "usr-manager-1"
  ) {
    assertDatabaseReadyForRuntime();

    if (isDatabaseConfigured()) {
      const [existing] = await db
        .select()
        .from(branches)
        .where(eq(branches.id, id))
        .limit(1);

      if (!existing) {
        throw new AppError("NOT_FOUND", `Branch '${id}' not found.`, 404);
      }

      const [updatedRow] = await db
        .update(branches)
        .set({
          ...(typeof updates.acceptOrders === "boolean" ? { acceptOrders: updates.acceptOrders } : {}),
          ...(typeof updates.maxCapacityOrdersPerHour === "number"
            ? { maxCapacityOrdersPerHour: updates.maxCapacityOrdersPerHour }
            : {}),
        })
        .where(eq(branches.id, id))
        .returning();

      await auditService.recordAuditEvent({
        actorId,
        actorRole,
        action: "BRANCH_SETTINGS_UPDATED",
        entityType: "BRANCH",
        entityId: id,
        details: `Updated branch '${updatedRow.name}' settings: ${JSON.stringify(updates)}`,
      });

      return {
        id: updatedRow.id,
        name: updatedRow.name,
        slug: updatedRow.slug,
        address: updatedRow.address,
        phone: updatedRow.phone,
        email: updatedRow.email,
        latitude: String(updatedRow.latitude),
        longitude: String(updatedRow.longitude),
        deliveryFeeMinor: updatedRow.deliveryFeeMinor,
        minOrderMinor: updatedRow.minOrderMinor,
        acceptOrders: updatedRow.acceptOrders,
        maxCapacityOrdersPerHour: updatedRow.maxCapacityOrdersPerHour,
      };
    }

    const branch = this.branchState.find((b) => b.id === id);
    if (!branch) {
      throw new AppError("NOT_FOUND", `Branch '${id}' not found.`, 404);
    }

    if (typeof updates.acceptOrders === "boolean") {
      branch.acceptOrders = updates.acceptOrders;
    }
    if (typeof updates.maxCapacityOrdersPerHour === "number") {
      branch.maxCapacityOrdersPerHour = updates.maxCapacityOrdersPerHour;
    }

    await auditService.recordAuditEvent({
      actorId,
      actorRole,
      action: "BRANCH_SETTINGS_UPDATED",
      entityType: "BRANCH",
      entityId: id,
      details: `Updated branch '${branch.name}' settings: ${JSON.stringify(updates)}`,
    });

    return { ...branch };
  }

  async validateCoupon(code: string, subtotalMinor: number) {
    assertDatabaseReadyForRuntime();

    const cleanCode = code.trim().toUpperCase();

    if (isDatabaseConfigured()) {
      const [dbCoupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, cleanCode))
        .limit(1);

      const now = new Date();
      if (
        !dbCoupon ||
        !dbCoupon.isActive ||
        dbCoupon.startsAt > now ||
        dbCoupon.expiresAt < now
      ) {
        throw new AppError("INVALID_COUPON", `Coupon code '${code}' is invalid or expired.`, 400);
      }

      if (subtotalMinor < dbCoupon.minSubtotalMinor) {
        const minRequired = (dbCoupon.minSubtotalMinor / 100).toFixed(2);
        throw new AppError(
          "INVALID_COUPON",
          `Order subtotal must be at least $${minRequired} to apply coupon ${cleanCode}.`,
          400
        );
      }

      let discountMinor = 0;
      if (dbCoupon.discountType === "PERCENTAGE") {
        discountMinor = Math.round((subtotalMinor * dbCoupon.discountValue) / 10000);
        if (dbCoupon.maxDiscountMinor && discountMinor > dbCoupon.maxDiscountMinor) {
          discountMinor = dbCoupon.maxDiscountMinor;
        }
      } else {
        discountMinor = Math.min(dbCoupon.discountValue, subtotalMinor);
      }

      return {
        code: dbCoupon.code,
        description: dbCoupon.description,
        discountType: dbCoupon.discountType as "PERCENTAGE" | "FIXED_AMOUNT",
        discountMinor,
      };
    }

    const now = new Date();
    const coupon = SEED_COUPONS.find(
      (c) =>
        c.code === cleanCode &&
        c.isActive &&
        (!c.startsAt || new Date(c.startsAt) <= now) &&
        (!c.expiresAt || new Date(c.expiresAt) >= now)
    );

    if (!coupon) {
      throw new AppError("INVALID_COUPON", `Coupon code '${code}' is invalid or expired.`, 400);
    }

    if (subtotalMinor < coupon.minSubtotalMinor) {
      const minRequired = (coupon.minSubtotalMinor / 100).toFixed(2);
      throw new AppError(
        "INVALID_COUPON",
        `Order subtotal must be at least $${minRequired} to apply coupon ${cleanCode}.`,
        400
      );
    }

    let discountMinor = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountMinor = Math.round((subtotalMinor * coupon.discountValue) / 10000);
      if (coupon.maxDiscountMinor && discountMinor > coupon.maxDiscountMinor) {
        discountMinor = coupon.maxDiscountMinor;
      }
    } else {
      discountMinor = Math.min(coupon.discountValue, subtotalMinor);
    }

    return {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountMinor,
    };
  }
}

export const catalogService = new CatalogService();


