# Enterprise Patterns Adoption & Reference Register

**Document ID:** FF-PATTERNS-001  
**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Status:** ENFORCED  

## 1. Reference System Classification

In accordance with Phase 02 requirements, external benchmarks or existing reference systems cited in customer specifications must be explicitly classified.

| Reference System | Authority Status | Scope of Reference |
|---|---|---|
| **Broadway Pizza Current Web Ordering** | **REFERENCE ONLY (Non-Authoritative)** | Information architecture, menu categorization, combo deal presentation, and multi-location expectations. Explicitly NOT authoritative for branding, visual layout, copywriting, or internal technology. |

---

## 2. Pattern Evaluation: Adopted vs Rejected

### Adopted Patterns

1. **Food-First Category Storefront Entry:**
   - *Rationale:* Eliminates corporate marketing friction. Customers see appetizing food categories immediately upon visiting `/`.
   - *Implementation:* Category chips/tabs with instant anchor/filter behavior; featured bundles pinned at top.

2. **Branch-Driven Service Qualification:**
   - *Rationale:* Restaurant food delivery depends on physical proximity, branch operating hours, and kitchen capacity.
   - *Implementation:* Early address/branch capture in order flow to qualify serviceable delivery zones before checkout.

3. **Prominent Deals & Bundles:**
   - *Rationale:* High-margin combos and promotional discounts are standard customer expectations in fast food.
   - *Implementation:* Server-evaluated promotions engine with item-level and order-level coupon rules.

4. **Multi-Channel Contact & Branch Information:**
   - *Rationale:* Customers require direct branch phone numbers, operating hours, and structured support inquiries.
   - *Implementation:* Dedicated `/locations` directory and persisted `support_tickets`.

---

### Rejected Patterns

1. **Brand Identity & Copy Mimicry:**
   - *Rejection Reason:* Strict customer constraint (PRD §1). The website must maintain a distinct, premium identity.
   - *Replacement:* Bespoke culinary visual system: near-black surfaces, glassmorphism panels, editorial typography, warm food accents, and narrative 3D.

2. **Client-Trusted Pricing / Cart Computation:**
   - *Rejection Reason:* Severe commercial and security vulnerability.
   - *Replacement:* 100% authoritative server-side calculation of subtotals, modifier deltas, delivery fees, and tax in integer minor units within an ACID database transaction.

3. **Monolithic Unstructured CMS Markup:**
   - *Rejection Reason:* Vulnerable to XSS, layout breakage, and poor responsive behavior.
   - *Replacement:* Strongly typed, JSON-schema-validated structured content blocks (`hero`, `story_split`, `ingredient_story`, `3d_scene`, `faq`).

4. **Blocking Visual Assets:**
   - *Rejection Reason:* Heavy legacy websites suffer from poor Core Web Vitals (LCP > 4s).
   - *Replacement:* 3D graphics isolated to narrative islands; responsive image formats (WebP/AVIF) for LCP targets $\le$ 2.5s.
