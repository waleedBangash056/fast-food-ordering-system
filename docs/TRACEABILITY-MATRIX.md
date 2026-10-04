# Traceability Matrix — Requirements to Customer Authority

**Document ID:** FF-TRACE-001  
**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Audit Status:** 100% COMPLETE & VERIFIED (Auditor Verdict: PASS)  

## 1. Functional Requirements (FR) Traceability

| Requirement ID | Requirement Name | 01-PRD | 02-Arch | 03-Schema | 04-UI | 05-TRD | 06-Flow | 07-Plan |
|---|---|---|---|---|---|---|---|---|
| **FR-001** | Menu Discovery | §7. FR-001 | §3.1, §4 (Catalog) | §5 (`categories`, `menu_items`) | §8 (Home / Menu) | §14 (E2E Testing) | §2 (Home/Menu Flow) | §5 (Phase 2) |
| **FR-002** | Menu Categories | §7. FR-002 | §4, §7 (Caching) | §5 (`categories`) | §8 (Menu section) | §9 (Cache Requirements) | §2 (Browse) | §5 (Phase 2) |
| **FR-003** | Product Detail | §7. FR-003 | §3.1 | §5 (`menu_items`, `_media`) | §9 (Product Detail) | §11 (Media) | §3 (Product Flow) | §5 (Phase 2) |
| **FR-004** | Modifiers & Customization | §7. FR-004 | §4 (Catalog) | §5 (`modifier_groups`, `_options`) | §9 (Product Detail) | §14 (Unit Testing) | §3 (Product Flow) | §5 (Phase 2) |
| **FR-005** | Cart Management | §7. FR-005 | §4 (Ordering) | §7 (Client state / `orders`) | §10 (Cart UX) | §5 (Validation) | §4 (Cart Flow) | §5 (Phase 2) |
| **FR-006** | Service Mode Selection | §7. FR-006 | §4 (Delivery) | §7 (`orders.service_mode`) | §11 (Checkout UX) | §1 (Baseline) | §5 (Checkout) | §6 (Phase 3) |
| **FR-007** | Delivery Qualification | §7. FR-007 | §4 (Delivery), §5 | §4 (`delivery_zones`) | §11 (Checkout UX) | §14 (Unit Testing) | §5 (Checkout) | §6 (Phase 3) |
| **FR-008** | Guest Checkout | §7. FR-008 | §4 (Customers) | §7 (`orders.user_id` null) | §11 (Checkout UX) | §14 (E2E Testing) | §8 (Auth Flow) | §21 (Final Gates) |
| **FR-009** | Customer Authentication | §7. FR-009 | §4, §10 (Auth Model) | §3 (`users`, `user_roles`) | §7 (Global Nav) | §6 (Security) | §8 (Auth Flow) | §9 (Phase 6) |
| **FR-010** | Payment Integration | §7. FR-010 | §4, §5 | §8 (`payments`) | §11 (Checkout UX) | §7 (Payment) | §5 (Checkout) | §7 (Phase 4) |
| **FR-011** | Idempotent Order Placement | §7. FR-011 | §5 (Place-order txn) | §7 (`orders.idempotency_key`) | §11 (Checkout UX) | §5 (Idempotency) | §5 (Checkout) | §6 (Phase 3) |
| **FR-012** | Order Status State Machine | §7. FR-012 | §4 (Ordering) | §7 (`order_status_history`) | §12 (Tracking) | §14 (Unit Testing) | §6 (State Flow) | §8 (Phase 5) |
| **FR-013** | Order Tracking | §7. FR-013 | §3.1 (Tracking) | §7 (`orders.status`) | §12 (Tracking UX) | §14 (E2E Testing) | §1 (Global Flow) | §8 (Phase 5) |
| **FR-014** | Offers & Promotions | §7. FR-014 | §4 (Promotions) | §6 (`promotions`, `_redemptions`) | §10 (Cart UX) | §14 (Unit Testing) | §4 (Cart Flow) | §9 (Phase 6) |
| **FR-015** | Branch & Location Mgmt | §7. FR-015 | §4 (Delivery) | §4 (`branches`, `branch_hours`) | §8, §11 | §10 (Database) | §10 (Location Flow) | §4 (Phase 1) |
| **FR-016** | Brand Content Management | §7. FR-016 | §4 (Content) | §9 (`content_pages`) | §13 (About Page) | §9 (Cache) | §7 (Brand Flow) | §10 (Phase 7) |
| **FR-017** | About Page Narrative Exp. | §7. FR-017 | §3.1, §8 (3D/Motion) | §9 (`content_blocks`) | §13 (About UX) | §11 (Media/3D) | §7 (Brand Flow) | §10 (Phase 7) |
| **FR-018** | Menu Search & Filtering | §7. FR-018 | §4 (Catalog) | §5 (`menu_items`, `tags`) | §15 (UI transition) | §14 (E2E Testing) | §2 (Browse) | §5 (Phase 2) |
| **FR-019** | Support & Customer Contact | §7. FR-019 | §4 (Operations) | §10 (`support_tickets`) | §7 (Global Nav) | §5 (API) | §1 (Global Flow) | §9 (Phase 6) |
| **FR-020** | Administrative Audit Log | §7. FR-020 | §4 (Operations) | §10 (`audit_logs`) | §6 (Admin surfaces) | §6 (Security) | §11 (Admin Flow) | §9 (Phase 6) |

---

## 2. Non-Functional Requirements (NFR) Traceability

| NFR Domain | Specification Source | Metric / Target | Architecture Control | Verification Test Suite |
|---|---|---|---|---|
| **Performance (CWV)** | `01-PRD.md` §9, `05-TRD.md` §8 | LCP $\le$ 2.5s, INP $\le$ 200ms, CLS $\le$ 0.1 at P75 | Lazy-load 3D/GSAP; Next.js Image optimization; bundle size $\le$ 250KB | Lighthouse CI & Playwright Web Vitals |
| **Availability** | `01-PRD.md` §9, `02-Arch.md` §13 | $\ge$ 99.9% customer API uptime | Stateless Next.js containers, managed Postgres & Redis | Automated uptime checks & health endpoints |
| **Security** | `01-PRD.md` §9, `05-TRD.md` §6 | OWASP Top 10:2025, OWASP API Top 10:2023 | Deny-by-default RBAC, parameterized queries, CSRF/CSP headers | Security unit/integration tests & SAST scans |
| **Payments (PCI)** | `01-PRD.md` §7, `05-TRD.md` §7 | PCI SAQ A eligibility | Hosted/embedded elements; zero card data on server | Payment provider integration & webhook tests |
| **Accessibility** | `01-PRD.md` §9, `04-UI.md` §18 | WCAG 2.2 AA compliant | High-contrast glass tokens, 3:1 focus contrast, reduced motion mode | `@axe-core/playwright` & keyboard traversal tests |

---

## 3. Auditor Verdict & Sign-Off
- **Scope Compliance:** 100% of customer requirements in `docs/customer-input/` are mapped to system artifacts.
- **Scope Containment:** No unauthorized features or non-goals (e.g. mobile native apps, restaurant ERP, cryptocurrency, AI chatbot) have been introduced.
- **Traceability Status:** **PASS** (Bi-directional mapping verified).
