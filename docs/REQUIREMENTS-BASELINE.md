# Requirements Baseline — Premium Fast-Food Restaurant

**Document ID:** FF-REQ-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** PHASE 01 BASELINED  
**Authority:** Synthesized from `01-PRD.md` through `07-Implementation-Plan.md` and ratified by the Requirements Engineering Council.

---

## 1. Product Definition & Operating Principles
The product is a premium, mobile-first fast-food restaurant commerce and brand experience website. It unifies high-conversion ordering with editorial brand storytelling, culinary glassmorphism, responsive depth, and selective 3D visuals.

### Primary Principles
1. **Food First:** The customer arrives immediately into an appetizing menu experience; navigation chrome and marketing copy stay secondary to food discovery.
2. **Authoritative Server Pricing:** All prices, modifiers, coupons, taxes, delivery fees, and order totals are computed and enforced server-side. Client-provided prices are never trusted.
3. **Idempotency & Zero Duplication:** High-consequence mutations (orders, payments, refunds, coupons) enforce strict idempotency to prevent duplicate charges or duplicate kitchen tickets.
4. **Accessible Glassmorphism:** Translucent glass cards sit on controlled backgrounds; all text, controls, and focus states strictly adhere to WCAG 2.2 AA.
5. **Non-Blocking 3D:** 3D graphics (Three.js/R3F) and GSAP animations are confined to narrative brand islands (About page) and must NEVER block the ordering critical path.

---

## 2. Target Roles & Permission Surface
- `GUEST`: Unauthenticated user; can browse menus, customize items, manage cart, place orders, and track active orders via secure tokens.
- `CUSTOMER`: Authenticated customer; benefits from saved addresses, order history, profile management, and 1-click reordering.
- `STAFF`: Store-level staff; views incoming order queues and updates kitchen operational status.
- `KITCHEN_OPERATOR`: Dedicated kitchen display interface; manages `ACCEPTED -> PREPARING -> READY` transitions.
- `BRANCH_MANAGER`: Manages branch-level operating hours, temporary closures, and branch-specific item availability.
- `CONTENT_MANAGER`: Manages brand stories, promotional banners, gallery items, and structured marketing content blocks.
- `ADMIN`: Full administrative control over catalog, pricing, branches, delivery zones, promotions, user accounts, and system settings.
- `SUPER_ADMIN`: Security administrator; manages administrative staff, roles, and reviews system audit logs.

---

## 3. Functional Requirements Specifications

### FR-001: Menu Discovery
- **Description:** Home route renders an appetizing, scannable food catalog within the initial viewport.
- **Preconditions:** Storefront categories and menu items seeded and active.
- **Postconditions:** Category navigation chips and featured items visible without secondary clicks.
- **Performance Budget:** LCP $\le$ 2.5s.
- **Error Path:** If menu API fails, displays branded retry state with cached menu items.

### FR-002: Menu Categories
- **Description:** Admin-configurable categories with display ordering, availability schedules, and promotional groupings.
- **Invariants:** Flat single-tier category structure for MVP. Inactive categories hide their items from browse views.

### FR-003: Product Detail
- **Description:** Detailed view exposing product media, name, description, authoritative base price, allergen tags, and modifier groups.
- **Preconditions:** Active product slug requested.
- **Boundary:** Maximum quantity per item line: 99.
- **Error Path:** Returns 404 for invalid slugs; disables "Add to Cart" if item becomes out of stock.

### FR-004: Modifiers & Customization
- **Description:** Structured modifier groups (Size, Spice Level, Add-ons, Removals, Sauces, Drinks, Sides, Combos).
- **Rules:**
  - Modifier groups support `required=true/false`, `min_selections`, and `max_selections`.
  - Negative price deltas are prohibited.
  - Selections are validated at cart addition and re-validated authoritatively at checkout commitment.

### FR-005: Cart Drawer & Management
- **Description:** Slide-over cart drawer on desktop, dedicated sheet/route on mobile.
- **Capabilities:** Item grouping by `(item_id, hash(modifiers, instructions))`, quantity stepper, modifier breakdown, coupon application input, and dynamic fee summaries.
- **Invariants:** Subtotal is recalculated on every mutation. Out-of-stock items trigger explicit warning and block checkout.

### FR-006: Service Mode Selection
- **Description:** User selects between `DELIVERY` and `PICKUP`.
- **Invariants:** Extensible for future `DINE_IN` mode in database schema and order aggregates.

### FR-007: Delivery Qualification & Service Zones
- **Description:** Validates customer delivery address against branch delivery zones (polygon GeoJSON and distance rules).
- **Rules:**
  - Auditable decision: records branch ID, zone ID, calculated distance, and fee timestamp.
  - Overlapping zones resolved by shortest distance or branch operational load.
  - Out-of-zone addresses politely rejected with immediate offer to switch to Pickup mode.

### FR-008: Guest Checkout
- **Description:** Frictionless checkout without mandatory account creation.
- **Fields:** `customer_name`, `customer_phone`, `customer_email` (optional), and delivery address.
- **Security:** Issues a high-entropy, cryptographically unguessable tracking token (UUIDv4) upon order creation.

### FR-009: Customer Authentication & Profile
- **Description:** Account registration, secure sign in, password recovery, address book, and order history.
- **Security Baseline:** Bcrypt/Argon2 password hashing, secure HTTP-only cookies, 30-day rolling session, 5-attempt rate-limiting lockout.

### FR-010: Provider-Agnostic Payment Integration
- **Description:** Abstracted `PaymentProvider` interface supporting hosted/embedded payment forms (e.g., Stripe).
- **Compliance:** PCI SAQ A compliant. No cardholder PAN, CVV, or expiration date touches application servers.
- **Recovery:** Webhooks idempotently confirm payment status independently of client redirect success.

### FR-011: Idempotent Order Placement
- **Description:** State-changing `POST /api/v1/orders` requires client-generated `idempotency_key`.
- **Rules:**
  - Executed inside a single ACID database transaction.
  - Validates menu availability, modifier rules, branch hours, and recalculates authoritative `total_minor`.
  - Emits transactional outbox event `order.created`.
  - Retries with identical key return the existing committed order.

### FR-012: Order Status State Machine
- **Allowed Normal Transitions:**
  $$\text{DRAFT} \to \text{PENDING\_PAYMENT} \to \text{PAID} \to \text{CONFIRMED} \to \text{ACCEPTED} \to \text{PREPARING} \to \text{READY} \to \text{OUT\_FOR\_DELIVERY} \to \text{DELIVERED}$$
- **Terminal Alternate Transitions:**
  - `PENDING_PAYMENT` $\to$ `PAYMENT_FAILED`
  - `CONFIRMED` / `ACCEPTED` $\to$ `CANCELLED` (Customer/Staff with reason)
  - `PAID` / `CONFIRMED` $\to$ `REJECTED` (Kitchen/Branch with reason $\to$ triggers refund)
  - `PAID` / `CONFIRMED` $\to$ `REFUNDED`

### FR-013: Order Tracking
- **Description:** Live visual order timeline with clear textual state descriptions.
- **Transport:** SSE (Server-Sent Events) or WebSockets with automated fallback to 10-second HTTP polling if connection drops.

### FR-014: Offers & Promotions Engine
- **Description:** Server-side discount evaluation supporting percentage discounts, fixed amounts, BOGO, combo pricing, and coupon codes.
- **Rules:**
  - Non-stackable unless explicitly marked `stackable=true`.
  - Evaluation order: Item discounts $\to$ Category discounts $\to$ Order coupon.
  - Maximum discount capped at item/cart subtotal (total cannot be negative).
  - Enforces per-user and global usage limits inside the order transaction.

### FR-015: Branch & Location Management
- **Description:** Multi-branch store records, operating hours per day of week, holiday exceptions (`branch_exceptions`), and branch-level menu availability overrides.

### FR-016: Brand Content Management
- **Description:** Structured content block repository (`hero`, `story_split`, `ingredient_story`, `timeline`, `gallery`, `3d_scene`, `quote`, `faq`) allowing marketing updates without code redeployment.

### FR-017: About Page Signature Experience
- **Description:** 7-stage narrative scroll experience utilizing GSAP ScrollTrigger, layered photography, and lazy-loaded 3D scenes.
- **Invariants:**
  - LCP asset must be an optimized image, never an unhydrated 3D canvas.
  - Full fallback to static imagery under `prefers-reduced-motion: reduce` or unsupported WebGL.

### FR-018: Menu Search & Filtering
- **Description:** Client/server search indexing item titles, descriptions, categories, and dietary tags (`Vegetarian`, `Spicy`, `Gluten-Free`).

### FR-019: Support & Inquiries
- **Description:** Contact form supporting structured inquiry categories (Order Issue, General Feedback, Catering). Messages persisted to `support_tickets` with rate limiting.

### FR-020: Administrative Audit Logging
- **Description:** Immutable security and business audit log capturing actor, action, entity type, entity ID, before/after JSON diffs, IP hash, and request ID. 1-year retention.

---

## 4. Non-Functional Requirements & Performance Budgets
1. **Core Web Vitals (75th percentile):**
   - Largest Contentful Paint (LCP) $\le$ 2.5s
   - Interaction to Next Paint (INP) $\le$ 200ms
   - Cumulative Layout Shift (CLS) $\le$ 0.1
2. **Payload Budgets:**
   - Critical path JavaScript $\le$ 250 KB compressed.
   - Three.js / R3F / GSAP bundles strictly code-split and loaded on demand.
3. **Availability & Resilience:**
   - $\ge$ 99.9% uptime for core commerce endpoints.
   - Non-critical services (3D, recommendations) degrade gracefully without breaking ordering.
4. **Security Standard:**
   - OWASP Top 10:2025 and OWASP API Security Top 10:2023 compliance.
   - Anti-CSRF, Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options headers.
5. **Accessibility Standard:**
   - WCAG 2.2 Level AA compliance across all routes and interactive states.
