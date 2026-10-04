# Feature Registry & Traceability Map

**Document ID:** FF-FEAT-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

All customer functional requirements (FR-001 through FR-020) are registered below with their bounded modules, primary UI routes, database tables, and critical acceptance rules.

| Feature ID | Feature Name | Bounded Module | Primary Route / Surface | Database Tables | Core Acceptance Standard |
|---|---|---|---|---|---|
| **FR-001** | Menu Discovery | Catalog | `/`, `/menu` | `categories`, `menu_items` | Homepage opens directly with food items and categories. Fast scanning, zero delay. |
| **FR-002** | Menu Categories | Catalog | `/menu`, `/menu/[category]` | `categories`, `menu_items` | Admin configurable categories, sort order, availability, and promotional grouping. |
| **FR-003** | Product Detail | Catalog | Modal / `/product/[slug]` | `menu_items`, `menu_item_media`, `modifier_groups` | High-res food imagery, descriptions, prices, allergen labels, add-to-cart action. |
| **FR-004** | Modifiers & Customization | Catalog / Pricing | Product Detail modal / sheet | `modifier_groups`, `modifier_options` | Required & optional modifier groups, min/max selection rules, price deltas calculated dynamically. |
| **FR-005** | Cart Drawer & Management | Ordering | Slide-over drawer / `/cart` | In-memory / session state validated server-side | Item grouping, quantity stepper, modifier summaries, coupon entry, authoritative subtotal, delivery fee, tax. |
| **FR-006** | Service Mode Selection | Delivery / Ordering | Header / Checkout | `branches`, `delivery_zones` | Supports Delivery and Pickup at launch. Extensible for Dine-in without aggregate rewrite. |
| **FR-007** | Delivery Qualification | Delivery | Checkout / Service modal | `branches`, `delivery_zones`, `user_addresses` | Address geocoded/validated against branch delivery polygons/distance; auditable delivery fee calculated server-side. |
| **FR-008** | Guest Checkout | Ordering / Customers | `/checkout` | `orders`, `order_items` | Guests can complete orders with minimal friction (name, phone, address, payment) without forced account creation. Unguessable tracking token issued. |
| **FR-009** | Customer Authentication & Profile | Customers | `/auth/login`, `/account` | `users`, `user_roles`, `user_addresses` | Secure sign in, session management, address book, order history, customer/admin/operator role separation. |
| **FR-010** | Payment Integration | Payments | `/checkout` (hosted/embedded) | `payments`, `payment_events` | Abstracted `PaymentProvider`, PCI SAQ A compliance (zero local card data storage), webhooks verified and handled. |
| **FR-011** | Idempotent Order Placement | Ordering | `POST /api/v1/orders` | `orders`, `order_items`, `order_item_modifiers`, `order_events` | Idempotency key required. Duplicate submits return existing order. Atomic database transaction recalculates all totals. |
| **FR-012** | Order Status State Machine | Ordering | Backend domain service | `orders`, `order_status_history` | Rigorous state machine: `DRAFT -> PENDING_PAYMENT -> PAID -> CONFIRMED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED` (plus terminal cancellation/refund states). |
| **FR-013** | Order Tracking | Ordering | `/orders/[id]/track` | `orders`, `order_status_history` | Live visual timeline, text status updates, SSE/WebSocket with resilient HTTP polling fallback. |
| **FR-014** | Offers & Promotions | Promotions | `/offers`, `/checkout` | `promotions`, `coupon_redemptions` | Percentage/fixed discounts, BOGO, minimum order limits, date windows, branch eligibility, usage limits enforced server-side. |
| **FR-015** | Branch & Location Management | Delivery / Branches | `/locations`, `/locations/[slug]` | `branches`, `branch_hours`, `branch_exceptions` | Multi-branch directory, operating hours, temporary closures, service modes, branch-specific menu availability. |
| **FR-016** | Brand Content Management | Content | `/about`, `/craft`, `/gallery` | `content_pages`, `content_blocks` | Structured content blocks (hero, story split, ingredient, quote, CTA) editable without code deployment. |
| **FR-017** | About Page Narrative Experience | Content / Brand | `/about` | `content_pages`, `content_blocks` | Cinematic scroll-driven narrative with GSAP ScrollTrigger, editorial typography, layered imagery, lazy-loaded 3D with mobile fallback. |
| **FR-018** | Menu Search & Filtering | Catalog | `/search`, `/menu` | `menu_items`, `categories` | Fast client/server search over name, description, tags, and dietary labels. Accessible filter chips. |
| **FR-019** | Support & Customer Contact | Operations | `/contact`, `/support` | `support_tickets` | Contact form with structured issue categories, customer inquiry persistence, branch contact routing. |
| **FR-020** | Administrative Audit Logging | Operations | `/admin/audit-logs` | `audit_logs` | Immutable audit log of all admin mutations (pricing, availability, promotions, branches, orders) with actor and before/after diffs. |
