import crypto from "node:crypto";
import {
  pgSchema,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SeedModifierGroup } from "./seed-data";

/**
 * Dedicated PostgreSQL schema for Smash & Sizzle (Fast-Food).
 * Ensures complete isolation from `public`, `nexora_demo`, and Supabase system schemas.
 */
export const fastfoodSchema = pgSchema("fastfood_app");

// 1. users
export const users = fastfoodSchema.table("users", {
  id: text("id").$defaultFn(() => `usr-${crypto.randomUUID()}`).primaryKey(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  pinHash: text("pin_hash"),
  role: text("role").notNull().default("CUSTOMER"), // GUEST, CUSTOMER, STAFF, KITCHEN_OPERATOR, BRANCH_MANAGER, CONTENT_MANAGER, ADMIN, SUPER_ADMIN
  fullName: text("full_name").notNull(),
  branchId: text("branch_id").default("branch-1"),
  branchName: text("branch_name").default("Downtown Flagship"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. user_addresses
export const userAddresses = fastfoodSchema.table("user_addresses", {
  id: text("id").$defaultFn(() => `addr-${crypto.randomUUID()}`).primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull().default("Home"),
  streetAddress: text("street_address").notNull(),
  unit: text("unit"),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  isDefault: boolean("is_default").notNull().default(false),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. branches
export const branches = fastfoodSchema.table("branches", {
  id: text("id").$defaultFn(() => `branch-${crypto.randomUUID()}`).primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  deliveryFeeMinor: integer("delivery_fee_minor").notNull().default(499),
  minOrderMinor: integer("min_order_minor").notNull().default(1500),
  isActive: boolean("is_active").notNull().default(true),
  acceptOrders: boolean("accept_orders").notNull().default(true),
  maxCapacityOrdersPerHour: integer("max_capacity_orders_per_hr").notNull().default(60),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. branch_hours
export const branchHours = fastfoodSchema.table("branch_hours", {
  id: text("id").$defaultFn(() => `bh-${crypto.randomUUID()}`).primaryKey(),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  openTime: text("open_time").notNull(), // "10:00"
  closeTime: text("close_time").notNull(), // "23:00"
  isClosed: boolean("is_closed").notNull().default(false),
});

// 5. branch_exceptions
export const branchExceptions = fastfoodSchema.table("branch_exceptions", {
  id: text("id").$defaultFn(() => `bex-${crypto.randomUUID()}`).primaryKey(),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  date: text("date").notNull(), // "YYYY-MM-DD"
  isClosed: boolean("is_closed").notNull().default(true),
  customOpenTime: text("custom_open_time"),
  customCloseTime: text("custom_close_time"),
  reason: text("reason").notNull(),
});

// 6. delivery_zones
export const deliveryZones = fastfoodSchema.table("delivery_zones", {
  id: text("id").$defaultFn(() => `dz-${crypto.randomUUID()}`).primaryKey(),
  branchId: text("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
  zoneName: text("zone_name").notNull(),
  geometry: jsonb("geometry").notNull(), // GeoJSON polygon or circle radius
  minOrderAmountMinor: integer("min_order_amount_minor").notNull().default(1500), // $15.00
  deliveryFeeMinor: integer("delivery_fee_minor").notNull().default(499), // $4.99
  estimatedDeliveryMinutes: integer("estimated_delivery_minutes").notNull().default(35),
  isActive: boolean("is_active").notNull().default(true),
});

// 7. categories
export const categories = fastfoodSchema.table("categories", {
  id: text("id").$defaultFn(() => `cat-${crypto.randomUUID()}`).primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// 8. menu_items
export const menuItems = fastfoodSchema.table(
  "menu_items",
  {
    id: text("id").$defaultFn(() => `item-${crypto.randomUUID()}`).primaryKey(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }).notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    basePriceMinor: integer("base_price_minor").notNull(),
    imageUrl: text("image_url").notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    isHalal: boolean("is_halal").notNull().default(false),
    isGlutenFree: boolean("is_gluten_free").notNull().default(false),
    isVegan: boolean("is_vegan").notNull().default(false),
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    isSpicy: boolean("is_spicy").notNull().default(false),
    modifierGroupsJson: jsonb("modifier_groups_json").$type<SeedModifierGroup[]>(),
    displayOrder: integer("display_order").notNull().default(0),
    calories: integer("calories").notNull().default(650),
    prepTimeMinutes: integer("prep_time_minutes").notNull().default(12),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("menu_items_cat_order_idx").on(table.categoryId, table.displayOrder),
    index("menu_items_slug_idx").on(table.slug),
  ]
);

// 9. modifier_groups
export const modifierGroups = fastfoodSchema.table("modifier_groups", {
  id: text("id").$defaultFn(() => `mg-${crypto.randomUUID()}`).primaryKey(),
  name: text("name").notNull(),
  selectionType: text("selection_type").notNull().default("SINGLE"), // SINGLE, MULTIPLE
  minSelections: integer("min_selections").notNull().default(0),
  maxSelections: integer("max_selections").notNull().default(1),
  isRequired: boolean("is_required").notNull().default(false),
});

// 10. menu_item_modifier_groups
export const menuItemModifierGroups = fastfoodSchema.table("menu_item_modifier_groups", {
  id: text("id").$defaultFn(() => `mimg-${crypto.randomUUID()}`).primaryKey(),
  menuItemId: text("menu_item_id").references(() => menuItems.id, { onDelete: "cascade" }).notNull(),
  modifierGroupId: text("modifier_group_id").references(() => modifierGroups.id, { onDelete: "cascade" }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

// 11. modifier_options
export const modifierOptions = fastfoodSchema.table("modifier_options", {
  id: text("id").$defaultFn(() => `mo-${crypto.randomUUID()}`).primaryKey(),
  modifierGroupId: text("modifier_group_id").references(() => modifierGroups.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  priceDeltaMinor: integer("price_delta_minor").notNull().default(0),
  isDefault: boolean("is_default").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// 12. coupons
export const coupons = fastfoodSchema.table("coupons", {
  id: text("id").$defaultFn(() => `cpn-${crypto.randomUUID()}`).primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  discountType: text("discount_type").notNull(), // PERCENTAGE, FIXED_AMOUNT
  discountValue: integer("discount_value").notNull(), // bps (e.g. 1000 for 10%) or minor units (e.g. 500 for $5.00)
  minSubtotalMinor: integer("min_subtotal_minor").notNull().default(0),
  maxDiscountMinor: integer("max_discount_minor"),
  maxUsesTotal: integer("max_uses_total"),
  maxUsesPerUser: integer("max_uses_per_user").default(1),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// 13. coupon_redemptions
export const couponRedemptions = fastfoodSchema.table("coupon_redemptions", {
  id: text("id").$defaultFn(() => `cpr-${crypto.randomUUID()}`).primaryKey(),
  couponId: text("coupon_id").references(() => coupons.id).notNull(),
  orderId: text("order_id").notNull(),
  userId: text("user_id"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
  discountAppliedMinor: integer("discount_applied_minor").notNull(),
});

// 14. orders
export const orders = fastfoodSchema.table(
  "orders",
  {
    id: text("id").$defaultFn(() => `ord-${crypto.randomUUID().slice(0, 8)}`).primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id").references(() => users.id),
    guestEmail: text("guest_email"),
    guestPhone: text("guest_phone"),
    guestName: text("guest_name"),
    trackingToken: text("tracking_token").notNull(),
    branchId: text("branch_id").references(() => branches.id).notNull(),
    serviceMode: text("service_mode").notNull(), // DELIVERY, PICKUP
    status: text("status").notNull().default("PENDING_PAYMENT"),
    subtotalMinor: integer("subtotal_minor").notNull(),
    discountMinor: integer("discount_minor").notNull().default(0),
    deliveryFeeMinor: integer("delivery_fee_minor").notNull().default(0),
    taxMinor: integer("tax_minor").notNull(),
    totalMinor: integer("total_minor").notNull(),
    notes: text("notes"),
    cancelReason: text("cancel_reason"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orders_branch_status_idx").on(table.branchId, table.status),
    index("orders_user_idx").on(table.userId),
    index("orders_tracking_token_idx").on(table.trackingToken),
    index("orders_created_at_idx").on(table.createdAt),
  ]
);

// 15. order_items (Immutable historical snapshot)
export const orderItems = fastfoodSchema.table("order_items", {
  id: text("id").$defaultFn(() => `oi-${crypto.randomUUID().slice(0, 8)}`).primaryKey(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  menuItemId: text("menu_item_id").notNull(),
  itemNameSnapshot: text("item_name_snapshot").notNull(),
  basePriceMinorSnapshot: integer("base_price_minor_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalMinor: integer("line_total_minor").notNull(),
});

// 16. order_item_modifiers (Immutable historical snapshot)
export const orderItemModifiers = fastfoodSchema.table("order_item_modifiers", {
  id: text("id").$defaultFn(() => `oim-${crypto.randomUUID().slice(0, 8)}`).primaryKey(),
  orderItemId: text("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }).notNull(),
  modifierOptionId: text("modifier_option_id"),
  groupNameSnapshot: text("group_name_snapshot").notNull(),
  optionNameSnapshot: text("option_name_snapshot").notNull(),
  priceDeltaMinorSnapshot: integer("price_delta_minor_snapshot").notNull(),
});

// 17. delivery_address_snapshot (Immutable snapshot)
export const deliveryAddressSnapshot = fastfoodSchema.table("delivery_address_snapshot", {
  id: text("id").$defaultFn(() => `das-${crypto.randomUUID().slice(0, 8)}`).primaryKey(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull().unique(),
  streetAddress: text("street_address").notNull(),
  unit: text("unit"),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  deliveryInstructions: text("delivery_instructions"),
});

// 18. order_status_history
export const orderStatusHistory = fastfoodSchema.table("order_status_history", {
  id: text("id").$defaultFn(() => `osh-${crypto.randomUUID().slice(0, 8)}`).primaryKey(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  previousStatus: text("previous_status"),
  newStatus: text("new_status").notNull(),
  changedByUserId: text("changed_by_user_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 19. payments
export const payments = fastfoodSchema.table(
  "payments",
  {
    id: text("id").$defaultFn(() => `pay-${crypto.randomUUID()}`).primaryKey(),
    orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
    provider: text("provider").notNull(), // STRIPE, CASH_ON_DELIVERY, MOCK
    providerTransactionId: text("provider_transaction_id"),
    providerIntentId: text("provider_intent_id"),
    status: text("status").notNull().default("REQUIRES_PAYMENT_METHOD"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("USD"),
    idempotencyKey: text("idempotency_key").unique(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("payments_order_idx").on(table.orderId)]
);

// 20. payment_events (Webhook Deduplication)
export const paymentEvents = fastfoodSchema.table(
  "payment_events",
  {
    id: text("id").$defaultFn(() => `pe-${crypto.randomUUID()}`).primaryKey(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"), // PENDING, PROCESSED, FAILED, IGNORED
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payment_events_provider_event_idx").on(table.provider, table.providerEventId),
  ]
);

// 21. order_events (Transactional Outbox)
export const orderEvents = fastfoodSchema.table(
  "order_events",
  {
    id: text("id").$defaultFn(() => `evt-${crypto.randomUUID()}`).primaryKey(),
    aggregateType: text("aggregate_type").notNull().default("ORDER"),
    aggregateId: text("aggregate_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"), // PENDING, PUBLISHED, FAILED
    retryCount: integer("retry_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("order_events_status_created_idx").on(table.status, table.createdAt),
  ]
);

// 22. audit_logs (Immutable audit ledger)
export const auditLogs = fastfoodSchema.table(
  "audit_logs",
  {
    id: text("id").$defaultFn(() => `aud-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`).primaryKey(),
    actorId: text("actor_id"),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    details: text("details"),
    oldValues: jsonb("old_values"),
    newValues: jsonb("new_values"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_actor_idx").on(table.actorId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ]
);
