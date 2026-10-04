# Core System Invariants

**Document ID:** FF-INV-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** ENFORCED  

These invariants are mandatory rules established across customer specifications (`01-PRD.md` through `07-Implementation-Plan.md`). No implementation slice, optimization, or refactoring may violate them.

---

## 1. Domain & Financial Invariants
1. **Server Pricing Authority:** All menu item prices, modifier deltas, delivery fees, taxes, discounts, and order totals are authoritatively computed and enforced on the server. Client-submitted prices or totals are NEVER trusted.
2. **Integer Minor Units:** Money must always be represented and stored as an integer minor unit (e.g. cents, `base_price_minor`, `total_minor`) with an explicit 3-character ISO currency code. Floating-point currency representation is prohibited.
3. **Total Calculation Formula:** 
   $$\text{total\_minor} = \text{subtotal\_minor} - \text{discount\_minor} + \text{delivery\_fee\_minor} + \text{tax\_minor} + \text{service\_fee\_minor}$$
4. **Historical Order Immutability:** Once an order is confirmed, its financial line-item history is strictly immutable. Changes may only occur via explicit adjustment or refund transaction records.
5. **Separation of State:** Payment status and order status are decoupled entities (`payments.status` vs `orders.status`). An order cannot transition to `CONFIRMED` without authoritative payment success (or cash-on-delivery qualification).
6. **Branch Availability Rule:** A menu item or modifier marked inactive or unavailable at a specific branch cannot be added to an order or checked out from that branch.

---

## 2. Reliability & Mutation Invariants
1. **Order Creation Idempotency:** Every order creation request (`POST /api/v1/orders`) requires an idempotency key (`orders.idempotency_key` unique constraint). Retries, double-clicks, or connection resets MUST return the existing order record without duplicating charges or creating ghost orders.
2. **Webhook Idempotency:** All payment provider callbacks and webhooks must enforce deduplication using unique `(provider, provider_event_id)` constraints and idempotency checks before state transitions.
3. **Atomic Transactions:** Order creation, modifier validation, inventory/availability check, coupon redemption, and transactional outbox event emission must execute within a single ACID database transaction.
4. **Outbox Pattern:** Critical domain events (`order.created`, `order.confirmed`, `order.status_changed`, `payment.succeeded`) must be persisted to the `order_events` outbox table within the business transaction before external publication.

---

## 3. Security & Access Control Invariants
1. **PCI SAQ A Compliance:** The application database must NEVER store, transmit, or process raw credit card numbers, CVVs, or cardholder credentials. All card capture must originate directly from validated third-party provider-hosted or embedded elements.
2. **Deny by Default RBAC:** All operational and administrative endpoints require server-side authentication and role-based permissions (`CUSTOMER`, `STAFF`, `KITCHEN_OPERATOR`, `BRANCH_MANAGER`, `CONTENT_MANAGER`, `ADMIN`, `SUPER_ADMIN`).
3. **BOLA / IDOR Prevention:** Object-level authorization must be enforced on every resource access. Customers can only access their own orders and addresses; guest tracking requires unguessable high-entropy tracking tokens.
4. **Administrative Auditability:** Every administrative modification to prices, availability, delivery zones, promotions, branches, and order status must create an immutable record in `audit_logs` capturing actor, action, entity, timestamp, before/after data, and request metadata.

---

## 4. UI/UX, Performance, & Accessibility Invariants
1. **Food First:** The home experience must open directly into the food/menu discovery experience rather than a generic corporate brochure.
2. **3D Non-Blocking Rule:** 3D graphics (Three.js/R3F) and heavy GSAP animations are optional brand storytelling enhancements. They must NEVER block the ordering critical path, must be lazy-loaded on the About page, and must have a lightweight static/mobile fallback.
3. **Reduced Motion Compliance:** When `prefers-reduced-motion: reduce` is detected, all camera motion, parallax, scrubbed scroll animation, and continuous 3D rotations must be disabled.
4. **Accessibility Baseline:** All user-facing views must conform to WCAG 2.2 AA. Controls must maintain visible focus indicators (minimum 3:1 contrast against glass surfaces), accessible labels, and support full keyboard navigation.
5. **Core Web Vitals Budgets (75th Percentile):**
   - LCP $\le$ 2.5s
   - INP $\le$ 200ms
   - CLS $\le$ 0.1
