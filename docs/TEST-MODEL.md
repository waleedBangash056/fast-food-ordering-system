# Test Model - Premium Fast-Food Restaurant

**Document ID:** FF-TEST-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

## 1. Test Strategy & Philosophy
This document outlines the testing strategy for the Fast-Food Restaurant application. Our testing philosophy rejects pure metric-chasing (e.g., "100% coverage") and instead mandates **evidence that tests can detect broken behavior**. Tests must fail when business constraints, security rules, or architectural invariants are violated.

We explicitly model semantic interactions across route, context, role, and state equivalence classes to eradicate the defect class **"works in one location but not another"**.

## 2. Testing Rings

### Ring A: Static Correctness
**Objective:** Eliminate type errors, syntax issues, and schema mismatches before runtime.
- **Tools:** TypeScript 5 (Strict Mode), ESLint, Zod.
- **Coverage:** All inputs, outputs, and configurations are strongly typed. Zod schemas validate boundary conditions (e.g., .min(), .max(), .strict()).

### Ring B: Domain Business Rules & Property Tests
**Objective:** Verify pure business logic (pricing, limits, state transitions) independently of infrastructure.
- **Tools:** Vitest / Jest.
- **Coverage:**
  - Pricing formulas: Ensure base price + modifiers = total.
  - Modifier limits: Prevent exceeding max_choices.
  - Coupons/Discounts: Apply logic to cart totals.
  - State Machines: Order state transitions (PENDING -> PAID -> PREPARING -> READY -> DELIVERED). Must reject invalid transitions.

### Ring C: Contract & Database Integration Tests
**Objective:** Validate interactions with the persistence tier and external contracts.
- **Tools:** Postgres 18 Test Containers, Drizzle ORM, Vitest.
- **Coverage:**
  - Place-order transaction (ACID properties, rollback on failure).
  - Outbox worker processing.
  - Webhook idempotency and signature verification.
  - Database schema migrations up/down testing.

### Ring D: E2E Browser User Journeys
**Objective:** Verify complete vertical slices from the user's perspective.
- **Tools:** Playwright.
- **Coverage:**
  - Guest: Browse menu -> Add to cart -> Checkout -> Track Order.
  - Authenticated Customer: Login -> View History -> Reorder.
  - Kitchen Operator: View queue -> Update status -> Refund.

### Ring E & E.5: Interaction & Permission Consistency Audit
**Objective:** Ensure UI state maps accurately to permissions, avoiding "works here but not there."
- **Tools:** Playwright / React Testing Library.
- **Coverage:** 
  - Render parity: If API rejects action, UI must not show the button, OR must handle the explicit error state.
  - Navigation shell consistency.

### Ring F: Accessibility (a11y)
**Objective:** Ensure usable experiences for all users.
- **Tools:** @axe-core/playwright.
- **Coverage:** WCAG 2.2 AA standard. Keyboard focus traversal, ARIA labels, contrast ratios on all interactive elements.

### Ring G: Security Verification
**Objective:** Automate threat mitigations from THREAT-MODEL.md.
- **Tools:** Custom scripts, Playwright, API testing.
- **Coverage:** BOLA/IDOR, Price Tampering, Webhook Spoofing, Rate Limits. (Detailed in SECURITY-VERIFICATION-MATRIX.md).

### Ring H: Performance Testing & Budgets
**Objective:** Maintain strict performance thresholds.
- **Tools:** Lighthouse CI, k6.
- **Budgets:**
  - **LCP (Largest Contentful Paint):** < 2.5s (Mobile 3G throttling).
  - **FID (First Input Delay):** < 100ms.
  - **CLS (Cumulative Layout Shift):** < 0.1.
  - **TTFB (Time to First Byte):** < 200ms (Cache hit), < 800ms (Cache miss/Dynamic).
  - **API Rate Limits:** Menu endpoint ~ 1000 req/sec; Checkout ~ 50 req/sec.

## 3. Defect Prevention: "Works in One Location But Not Another"
To prevent inconsistent behavior, tests must parameterized across:
- **Routes:** Dashboard vs. Direct Link vs. Deep Link.
- **Contexts:** Desktop vs. Mobile layout; Fresh session vs. Stale session.
- **Roles:** Guest, Customer, Admin.
- **States:** Empty cart, Partial cart, Applied coupon, Expired coupon.

## 4. UI/API Capability Parity
For every action (e.g., Cancel Order):
1. **API Test:** Fails if status != PENDING or user != owner.
2. **UI Test:** Verifies Cancel Order button is **hidden** if status != PENDING or user != owner.
3. **E2E Test:** User clicks button -> API succeeds -> UI reflects new state.

## 5. Authorization Matrix Coverage
Every protected action requires these explicit test scenarios:
- **Allowed:** Correct role, correct resource, valid state -> 2xx, success.
- **Denied-Role:** Insufficient role (e.g., Guest calling Admin API) -> 403 Forbidden.
- **Wrong-Resource:** Valid role, but wrong target (e.g., User A accessing User B's order) -> 404 or 403.
- **Tampered-Property:** Modifying read-only fields (e.g., injecting price: 0) -> 400 Bad Request (Zod strict rejection).
- **Alternate-Entry-Path:** Executing action via alternate UI flows (e.g., direct API curl) must yield identical auth behavior.
