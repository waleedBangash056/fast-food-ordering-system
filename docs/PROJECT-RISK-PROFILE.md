# Project Risk Profile

**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Classification Baseline:** Production-Grade Commerce + Brand Experience  

## 1. System Classification

| Dimension | Classification | Justification & Controls |
|---|---|---|
| **Criticality** | **HIGH (Tier 2 Commercial)** | Direct revenue-generating ordering platform. Downtime or checkout errors directly cause lost sales and reputational damage. |
| **Data Sensitivity** | **MEDIUM-HIGH (Confidential Customer PII)** | Customer names, phone numbers, delivery addresses, order history. Cardholder data is explicitly deferred to third-party hosted/embedded PCI SAQ A scope. |
| **Expected Scale** | **Medium to High Growth** | Initial multi-branch restaurant operations, peak rush hours (lunch/dinner order spikes), high concurrency during promotional campaigns. |
| **Availability Expectation** | **99.9% Target** | Monthly service availability >= 99.9% for ordering API. Graceful degradation required if non-critical services (e.g. 3D assets, recommendations) fail. |
| **Accessibility Compliance** | **WCAG 2.2 AA Mandatory** | Full keyboard navigation, visible focus indicators, screen reader semantics, and high contrast against glassmorphism surfaces. |
| **Threat Surface** | **Public Commercial API & Web** | High risk of duplicate order submission, price tampering, coupon abuse, BOLA/IDOR on order tracking, and DDoS during peak promotional events. |

---

## 2. Risk Matrix & Mitigations

### R-01: Financial & Order Duplication
- **Threat:** Network timeout, browser double-click, or webhook retry causing duplicate charges or double orders.
- **Severity:** CRITICAL (P0)
- **Mitigation:** Mandatory idempotency keys for `POST /api/v1/orders` and webhook handlers. Unique constraint on `(provider, provider_event_id)` and `orders.idempotency_key`.

### R-02: Price, Modifier, & Promotion Tampering
- **Threat:** Client manipulating payload prices, injecting negative totals, or bypassing modifier requirements.
- **Severity:** HIGH (P1)
- **Mitigation:** Zero trust of client prices. Complete server-side recalculation of subtotal, modifiers, delivery fee, taxes, and coupon discounts within an ACID database transaction.

### R-03: Performance Degradation from 3D & Heavy Visuals
- **Threat:** Three.js / R3F / GSAP assets increasing bundle size and causing LCP/INP violations on mobile devices.
- **Severity:** HIGH (P1)
- **Mitigation:** Strict isolation of 3D to narrative islands (About page). Home/menu critical path loaded without 3D dependencies. On-demand rendering, mobile fallbacks, and reduced-motion enforcement.

### R-04: Broken Object-Level Authorization (BOLA / IDOR)
- **Threat:** Unauthorized access to order tracking or customer addresses by guessing UUID/order numbers.
- **Severity:** HIGH (P1)
- **Mitigation:** External UUIDs, session-verified customer ownership for authenticated orders, cryptographically random order tracking tokens for guest orders, strict server-side RBAC for staff and operators.

### R-05: Glassmorphism Accessibility & Readability Failure
- **Threat:** Low contrast text, invisible focus rings, and blur rendering failures on low-end hardware.
- **Severity:** MEDIUM (P2)
- **Mitigation:** WCAG 2.2 AA compliant token system, solid background fallbacks for `backdrop-filter`, 3:1 focus ring contrast minimum, and automated axe-core Playwright verification.
