# Requirements Quality Matrix & Quality Assessment

**Document ID:** FF-RQM-001  
**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Status:** AUDITED & REMEDIATED  

## 1. Quality Dimensions Evaluated
Every requirement was reviewed by `requirements-quality-critic` against:
- **Singularity & Clarity:** Single responsibility, free of vague/marketing jargon.
- **Verifiability:** Testable via deterministic automated assertions or measurable criteria.
- **Completeness & Boundaries:** Preconditions, boundary values, error paths, and edge cases defined.
- **Acceptance Criteria:** Given/When/Then criteria defined for test development.

---

## 2. Requirements Evaluation Matrix

| Req ID | Requirement Name | Unambiguous? | Testable? | Complete? | Remediated Defect / Explicit Criteria |
|---|---|---|---|---|---|
| **FR-001** | Menu Discovery | YES | YES | YES | Remediated subjective term "immediately discoverable": Home route renders first category product grid within 1 viewport height without secondary click. LCP $\le$ 2.5s. |
| **FR-002** | Menu Categories | YES | YES | YES | Defined flat single-tier category structure for MVP with timezone-aware scheduling (`available_from`, `available_until` ISO timestamps). |
| **FR-003** | Product Detail | YES | YES | YES | Max quantity cap set to 99 items per line. Explicit tax inclusion/exclusion indicator required. Fallback placeholder image required if media URL fails. |
| **FR-004** | Modifiers & Customization | YES | YES | YES | Min/max bounds apply to the total count of selections within that modifier group. Negative price deltas prohibited. Group validation enforced before checkout. |
| **FR-005** | Cart Drawer & Management | YES | YES | YES | Cart items grouped by `(menu_item_id, hash(selected_modifiers, special_instructions))`. If an item becomes out-of-stock, checkout is blocked and cart item flagged. |
| **FR-006** | Service Mode Selection | YES | YES | YES | Service mode accepts `DELIVERY` and `PICKUP` for client storefront; database enum includes `DINE_IN` for future compatibility. |
| **FR-007** | Delivery Qualification | YES | YES | YES | Overlapping branch zones resolved by shortest Euclidean/driving distance or lowest delivery fee. Strict rejection with alternative branch/pickup prompt if out of zone. |
| **FR-008** | Guest Checkout | YES | YES | YES | Required guest fields: `customer_name`, `customer_phone`, `address_line_1`, `city` (for delivery). High-entropy unguessable tracking token generated. |
| **FR-009** | Customer Authentication | YES | YES | YES | Password minimum 8 characters with bcrypt/Argon2 hashing. Session expiration 30 days rolling. 5 failed login attempts trigger 15-minute account lockout. |
| **FR-010** | Payment Integration | YES | YES | YES | PCI SAQ A compliant hosted/embedded elements. Server receives provider webhook to verify payment state before fulfilling order. |
| **FR-011** | Idempotent Order Placement | YES | YES | YES | `idempotency_key` (UUIDv4) required in header/body. Valid for 24 hours. Concurrent duplicate requests return the original committed order. |
| **FR-012** | Order Status State Machine | YES | YES | YES | Enforced transition rules: `DRAFT -> PENDING_PAYMENT -> PAID -> CONFIRMED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED`. Customer can only cancel in `PENDING_PAYMENT` or `CONFIRMED`. Staff can `CANCEL` or `REJECT` with mandatory reason. |
| **FR-013** | Order Tracking | YES | YES | YES | Visual timeline with distinct text status labels. SSE stream updates with automatic HTTP polling fallback at 10-second intervals upon connection failure. |
| **FR-014** | Offers & Promotions | YES | YES | YES | Non-stackable unless `stackable=true`. Order of operations: Item-level discounts $\to$ Category discounts $\to$ Order-level coupons $\to$ Taxes and delivery fees. Discount cannot exceed subtotal. |
| **FR-015** | Branch & Location Mgmt | YES | YES | YES | Operating hours checked against branch local timezone. Special holiday closures in `branch_exceptions` override regular `branch_hours`. |
| **FR-016** | Brand Content Mgmt | YES | YES | YES | JSON schema validated structured content blocks (`hero`, `story_split`, `ingredient_story`, `timeline`, `gallery`, `3d_scene`, `quote`, `branch_cta`, `order_cta`, `faq`). |
| **FR-017** | About Page Experience | YES | YES | YES | 7-stage narrative scroll experience. 3D lazy-loads as an enhancement island; falls back to static optimized image when WebGL is unavailable or reduced motion is enabled. |
| **FR-018** | Menu Search & Filtering | YES | YES | YES | Case-insensitive substring matching against `menu_items.name`, `description`, `tags`, and `categories.slug`. Empty query returns default category list. |
| **FR-019** | Support & Customer Contact | YES | YES | YES | Contact form inputs validated: message max 2,000 characters. Rate limited to 5 submissions per 10 minutes per IP. Records stored in `support_tickets`. |
| **FR-020** | Administrative Audit Logging | YES | YES | YES | Every admin mutation creates an immutable row in `audit_logs` capturing `actor_user_id`, `action`, `entity_type`, `entity_id`, `before_data`, `after_data`, `request_id`, `created_at`. 1-year retention. |

---

## 3. P0/P1 Remediations Verified
- **Price Locking:** Order total is authoritatively calculated and locked into `orders.total_minor` upon order creation in `PENDING_PAYMENT` status. Upstream menu price edits do not affect existing pending or confirmed orders.
- **Concurrence & Idempotency:** Implemented unique constraints on `orders.idempotency_key` and `payment_events(provider, provider_event_id)` preventing double charges.
- **Accessibility vs Glassmorphism:** Implemented High-Contrast Glass standard with solid text and 3:1 focus ring contrast minimum.
