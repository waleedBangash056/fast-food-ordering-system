# Requirements Conflict Register & Resolution Governance

**Document ID:** FF-CONFLICTS-001  
**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Status:** RESOLVED & BASELINED  

This document logs discrepancies detected across the customer specification pack (`01-PRD.md` through `07-Implementation-Plan.md`) and records the authoritative factory engineering resolutions agreed upon by the requirements council.

---

## Conflict CR-01: State Machine Consistency (`REJECTED` state and `PAID` vs `CONFIRMED`)
- **Source Conflict:**
  - `01-PRD.md` (FR-012) identifies `REJECTED` as a terminal alternate state and groups `PAID/CONFIRMED`.
  - `06-App-Flow.md` (§6) omits `REJECTED` from the global state diagram, yet §12 (Admin Flow) allows kitchen/staff to "Reject + Reason".
  - `06-App-Flow.md` (§6) splits payment and confirmation sequentially: `PAID -> CONFIRMED`.
  - `03-Backend-Schema.md` (§7) has `orders.status` and `order_status_history`.
- **Affected Components:** Ordering Domain Service, Order State Machine, Admin Orders Queue, Customer Tracking Surface.
- **Factory Resolution:**
  - Separate `PAID` and `CONFIRMED`: An order transitions to `PAID` upon verified payment webhook receipt, and then transitions to `CONFIRMED` upon operational acceptance/inventory confirmation.
  - Formally add `REJECTED` to the database `order_status` enum and state machine: An order can transition from `PAID` or `CONFIRMED` to `REJECTED` (with mandatory reason in `order_status_history`), triggering an automatic refund flow.

---

## Conflict CR-02: Payment Flow Timing vs Order Creation Boundary
- **Source Conflict:**
  - `02-Architecture-and-Design.md` (§5) and `03-Backend-Schema.md` (§7) dictate that the server creates the Order in `PENDING_PAYMENT` state with authoritative recalculation of prices/modifiers/taxes, and *then* creates the payment intent.
  - `06-App-Flow.md` (§5) diagram shows: `Payment -> Result -> [Success] -> Create/Confirm Order`.
- **Affected Components:** Checkout Flow, API Controller (`POST /api/v1/orders`), Payment Adapter.
- **Factory Resolution:**
  - Architecture and Security authority strictly supersedes UI diagram flow. Client cannot dictate payment amount to gateway prior to server order creation.
  - The sequence is:
    1. Client submits checkout payload with `idempotency_key`.
    2. Server validates branch, items, modifiers, service zone, and coupons inside an ACID transaction.
    3. Server creates Order in `PENDING_PAYMENT` with authoritative `total_minor`.
    4. Server creates Payment Intent with the provider for exact `total_minor` and returns client secret / redirect URL.
    5. Customer completes payment.
    6. Server receives authenticated webhook from payment provider and idempotently transitions Order to `PAID`.

---

## Conflict CR-03: Field Name Typo & Multi-Dimensional Coupon Limits
- **Source Conflict:**
  - `03-Backend-Schema.md` (§4) has an accidental space typo in column names `accepts _*`.
  - `01-PRD.md` (FR-014) specifies multi-dimensional promotion limits (total usage limit, per-user usage limit), whereas `03-Backend-Schema.md` (§6) only includes a single `unique_key` column on `coupon_redemptions`.
- **Affected Components:** Database Schema, Promotions Domain Service, Drizzle ORM models.
- **Factory Resolution:**
  - Correct column names to `accepts_delivery` and `accepts_pickup` (boolean NOT NULL).
  - Enforce multi-dimensional coupon limits in the Promotions domain service within the order creation transaction: check count of `coupon_redemptions` for `promotion_id` (total) and `(promotion_id, user_id)` (per-user) before creating redemption record.

---

## Conflict CR-04: 3D Cinematic Visuals vs Core Web Vitals (LCP $\le$ 2.5s)
- **Source Conflict:**
  - `04-UI-UX.md` (§13) specifies a cinematic About page hero with depth movement, particles, and 3D scenes.
  - `01-PRD.md` (§9) and `05-TRD.md` (§8) strictly mandate LCP $\le$ 2.5s at 75th percentile and forbid shipping 3D libraries on routes that don't need them.
- **Affected Components:** About Page Route, Three.js / React Three Fiber Bundle, Web Vitals.
- **Factory Resolution:**
  - The LCP candidate on all routes (including About page) MUST be an optimized responsive static WebP/AVIF image or pre-rendered poster.
  - Three.js / React Three Fiber and GSAP ScrollTrigger must be dynamically imported via Next.js `next/dynamic` with `ssr: false` and on-demand rendering.
  - Under `prefers-reduced-motion: reduce` or mobile low-power mode, the 3D canvas is disabled and replaced by high-res photography.

---

## Conflict CR-05: Glassmorphism Aesthetic vs WCAG 2.2 AA Contrast
- **Source Conflict:**
  - `04-UI-UX.md` (§6) specifies translucent glass surfaces with 1px low-opacity borders and soft shadows.
  - `01-PRD.md` (§9) and `05-TRD.md` (§12) mandate WCAG 2.2 AA compliance (3:1 contrast for focus indicators and UI components, 4.5:1 for normal text).
- **Affected Components:** UI Component Library, Tailwind Design Tokens, Accessibility Focus System.
- **Factory Resolution:**
  - Implement a High-Contrast Glass standard:
    - Background blur (`backdrop-filter`) is purely decorative.
    - All text, icons, interactive controls, and error states must meet WCAG 2.2 AA contrast ratios against both glass and solid fallback backgrounds.
    - Focus indicators must use high-contrast solid outlines (e.g. 2px solid `accent-orange` or `accent-red` with minimum 3:1 contrast ratio against adjacent surfaces).
