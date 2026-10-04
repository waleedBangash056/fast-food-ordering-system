# Component Registry — Bounded Components & Architecture Boundaries

**Document ID:** FF-COMP-REG-001  
**Version:** 1.1  
**Date:** 2026-10-04  
**Status:** BASELINED & AUDITED  

This registry defines the definitive bounded components for the Premium Fast-Food Restaurant system, establishing clear file ownership, data boundaries, contracts, invariants, pagination models, and steward roles.

---

## 1. Catalog Component
- **Responsibility:** Manages menu items, categories, modifiers, availability rules, and allergen tags.
- **Owned Directory / Paths:** `src/server/domains/catalog/`, `src/features/menu/`
- **Data Ownership:** `menu_items`, `categories`, `modifier_groups`, `modifier_options`, `menu_item_media`, `branch_menu_items`
- **Inbound APIs:** `GET /api/v1/menu`, `GET /api/v1/menu/categories`, `GET /api/v1/products/:slug`
- **Outbound Events:** `menu.updated`, `category.updated`, `item.out_of_stock`
- **Dependencies:** Content, Shared Core | **Dependents:** Ordering, Pricing
- **Invariants:** Base price is integer minor units (cents). Non-negative modifier price deltas.
- **Caching Policy:** Publicly cacheable with tag-based invalidation (`catalog`).
- **Component Steward Role:** Menu Manager Steward

---

## 2. Pricing Component
- **Responsibility:** Authoritative server-side calculation of item line totals, taxes, delivery fees, and order amounts.
- **Owned Directory / Paths:** `src/server/domains/pricing/`
- **Data Ownership:** `tax_rules`, `fee_structures`, transient `pricing_snapshots`
- **Inbound APIs:** Internal domain methods (`calculateCartTotals()`)
- **Outbound Events:** `price.changed`
- **Dependencies:** Catalog, Delivery, Promotions, Shared Core | **Dependents:** Ordering
- **Invariants:** Total Formula: $\text{subtotal} - \text{discount} + \text{delivery\_fee} + \text{tax} + \text{service\_fee}$. Zero trust of client totals.
- **Component Steward Role:** Billing & Financial Integrity Steward

---

## 3. Promotions Component
- **Responsibility:** Manages coupons, promotional campaigns, eligibility validation, and redemption limits.
- **Owned Directory / Paths:** `src/server/domains/promotions/`, `src/features/promotions/`
- **Data Ownership:** `promotions`, `coupons`, `coupon_redemptions`
- **Inbound APIs:** Internal domain methods (`validateCoupon()`, `redeemCoupon()`)
- **Outbound Events:** `promotion.redeemed`, `promotion.expired`
- **Dependencies:** Shared Core | **Dependents:** Pricing, Ordering
- **Invariants:** Total discount cannot exceed subtotal. Non-stackable unless flagged. Per-user and global limits enforced atomically inside transaction.
- **Component Steward Role:** Promotions & Marketing Steward

---

## 4. Ordering Component
- **Responsibility:** Cart validation, idempotent order creation, line-item snapshots, order state machine, and status transitions.
- **Owned Directory / Paths:** `src/server/domains/orders/`, `src/features/cart/`, `src/features/checkout/`, `src/features/ordering/`
- **Data Ownership:** `orders`, `order_items`, `order_item_modifiers`, `order_status_history`
- **Inbound APIs:** `POST /api/v1/cart/validate`, `POST /api/v1/orders`, `GET /api/v1/orders/:id`, `POST /api/v1/orders/:id/cancel`, `GET /api/v1/orders` (cursor paginated)
- **Outbound Events:** `order.created`, `order.paid`, `order.confirmed`, `order.status_changed`, `order.cancelled`, `order.rejected`
- **Dependencies:** Customers, Catalog, Pricing, Promotions, Delivery, Shared Core | **Dependents:** Payments, Operations
- **Invariants:** Line items are immutable snapshots. Requires valid `idempotency_key`. Monotonic status progression.
- **Pagination Strategy:** ADR-008 Keyset cursor pagination over `orders(created_at DESC, id DESC)`. Limit capped at 100.
- **Caching Policy:** Strictly private, `no-store, no-cache`.
- **Component Steward Role:** OMS & Core Transaction Steward

---

## 5. Delivery Component
- **Responsibility:** Branch operations, delivery zone serviceability checks, distance calculations, and delivery quotes.
- **Owned Directory / Paths:** `src/server/domains/delivery/`, `src/server/domains/branches/`, `src/features/branches/`
- **Data Ownership:** `branches`, `delivery_zones`, `branch_hours`, `branch_exceptions`
- **Inbound APIs:** `GET /api/v1/branches`, `POST /api/v1/delivery/quote`
- **Outbound Events:** `branch.updated`, `delivery_zone.changed`
- **Dependencies:** Shared Core | **Dependents:** Ordering, Pricing
- **Invariants:** Delivery allowed only if `accepts_delivery = true` and branch currently open in local timezone. Authoritative distance calculation.
- **Component Steward Role:** Delivery & Branch Logistics Steward

---

## 6. Payments Component
- **Responsibility:** Payment intent creation, payment provider abstraction, webhook signature verification, and refund initiation.
- **Owned Directory / Paths:** `src/server/domains/payments/`
- **Data Ownership:** `payments`, `payment_events`
- **Inbound APIs:** `POST /api/v1/payments/intents`, `POST /api/v1/payments/webhooks/:provider`
- **Outbound Events:** `payment.succeeded`, `payment.failed`, `payment.refunded`
- **Dependencies:** Ordering, Shared Core | **Dependents:** Operations
- **Invariants:** Provider-agnostic adapter. PCI SAQ A compliant (zero PAN/CVV stored). Deduplicated by `(provider, provider_event_id)` index.
- **Caching Policy:** Strictly private, `no-store`.
- **Component Steward Role:** Payments Integration Steward

---

## 7. Customers Component
- **Responsibility:** User identity, authentication, session lifecycle, address book, preferences, and guest capability tokens.
- **Owned Directory / Paths:** `src/server/domains/customers/`, `src/features/account/`
- **Data Ownership:** `users`, `user_addresses`, `user_roles`, `favorites`
- **Inbound APIs:** `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/customers/me`
- **Outbound Events:** `customer.registered`, `address.added`
- **Dependencies:** Shared Core | **Dependents:** Ordering, Operations
- **Invariants:** Passwords hashed with bcrypt/Argon2. Guest orders receive unguessable UUIDv4 tracking token.
- **Caching Policy:** Strictly private, `no-store`.
- **Component Steward Role:** Identity & Access Management Steward

---

## 8. Content Component
- **Responsibility:** Brand storytelling, About page narrative experience, structured content blocks, gallery, and SEO metadata.
- **Owned Directory / Paths:** `src/server/domains/content/`, `src/features/brand-content/`
- **Data Ownership:** `content_pages`, `content_blocks`
- **Inbound APIs:** Internal server actions / route loaders
- **Outbound Events:** `content.published`
- **Dependencies:** Shared Core | **Dependents:** Catalog
- **Invariants:** Structured blocks validated against strict JSON schemas. 3D models lazy-loaded with static image LCP fallback.
- **Caching Policy:** Publicly cacheable at edge with tag `content`.
- **Component Steward Role:** Content & Brand Experience Steward

---

## 9. Operations Component
- **Responsibility:** Kitchen queue management, administrative dashboards, support tickets, and immutable audit logging.
- **Owned Directory / Paths:** `src/server/domains/operations/`, `src/app/admin/`
- **Data Ownership:** `audit_logs`, `support_tickets`
- **Inbound APIs:** `POST /api/v1/support/tickets`, `GET /api/v1/admin/audit-logs` (cursor paginated)
- **Outbound Events:** `audit.recorded`, `ticket.submitted`
- **Dependencies:** Ordering, Payments, Customers, Shared Core | **Dependents:** None
- **Invariants:** All admin mutations concurrently record an immutable audit log entry in the same transaction.
- **Pagination Strategy:** ADR-008 Keyset cursor pagination over `audit_logs(created_at DESC, id DESC)`.
- **Caching Policy:** Strictly private, `no-store`.
- **Component Steward Role:** Operations & Back-Office Steward

---

## 10. Shared Core Component
- **Responsibility:** Cross-cutting utilities, base domain types, value objects (`Money`, `IdempotencyKey`), database client, transactional outbox engine, and logger.
- **Owned Directory / Paths:** `src/lib/`, `src/components/ui/`, `src/types/`
- **Data Ownership:** `order_events` (outbox table)
- **Inbound / Outbound:** Internal TypeScript modules consumed across all domains.
- **Invariants:** Zero domain-specific business rules. High API stability.
- **Component Steward Role:** Foundation & Platform Steward
