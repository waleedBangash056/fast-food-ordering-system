# Customer Source Register

**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Registry Version:** 1.0  
**Date:** 2026-10-04  
**Status:** ACTIVE BASELINE  

## 1. Provided Customer Input Pack

Every document in `docs/customer-input/` is classified below. In accordance with Website Factory rules, files in `docs/customer-input/` are strictly **READ-ONLY**, never overwritten, renamed, or modified.

| Artifact / File Path | Document ID | Version & Date | Classification | Description & Scope | Authority Domain |
|---|---|---|---|---|---|
| `docs/customer-input/01-PRD.md` | FF-PRD-001 | v1.0 (2026-10-04) | **AUTHORITY** | Product Requirements Document: product definition, goals, non-goals, user roles, functional requirements FR-001 to FR-020, business rules, NFRs, success metrics. | Functional & Business Scope |
| `docs/customer-input/02-Architecture-and-Design.md` | FF-ARCH-001 | v1.0 (2026-10-04) | **AUTHORITY** | Modular monolith architecture, Next.js 16 App Router, domain boundaries, transactional boundaries, event outbox, caching, 3D/motion architecture, API design, RBAC, error & observability models. | Architecture & Engineering Design |
| `docs/customer-input/03-Backend-Schema.md` | FF-DB-001 | v1.0 (2026-10-04) | **AUTHORITY** | PostgreSQL 18 relational schema, Drizzle ORM models, tables (users, roles, addresses, branches, hours, delivery zones, categories, menu items, modifier groups, promotions, coupons, orders, order items, payments, content blocks, audit logs), indexes, invariants. | Database & Persistence Model |
| `docs/customer-input/04-UI-UX.md` | FF-UIUX-001 | v1.0 (2026-10-04) | **AUTHORITY** | Visual principles, glassmorphism rules, token families, typography, shape language, global navigation, screens (Home/Menu, Product Detail, Cart Drawer, Checkout, Order Tracking, About Signature narrative, Locations), 3D rules, motion tiers, responsive breakpoints, WCAG 2.2 AA. | UI/UX & Visual System |
| `docs/customer-input/05-TRD.md` | FF-TRD-001 | v1.0 (2026-10-04) | **AUTHORITY** | Technical Requirements Document: technology stack (Next.js 16, React 19, TypeScript 5, Tailwind CSS, GSAP, R3F/Three.js, Drizzle, PostgreSQL 18, Redis, Vitest, Playwright), security, performance budgets, testing, CI/CD gates. | Technical & Toolchain Baseline |
| `docs/customer-input/06-App-Flow.md` | FF-FLOW-001 | v1.0 (2026-10-04) | **AUTHORITY** | Customer journey, Home/Menu flow, Product customization flow, Cart flow, Checkout flow, Order state machine (DRAFT to DELIVERED), About storytelling flow, Admin operational flows, Failure & recovery flows. | Interaction & State Workflows |
| `docs/customer-input/07-Implementation-Plan.md` | FF-PLAN-001 | v1.0 (2026-10-04) | **AUTHORITY** | Phased vertical slice delivery plan (Phases 0-12), definition of done, acceptance criteria per slice, parallelization rules, final delivery gates. | Delivery & Verification Roadmap |

---

## 2. External References & Benchmarks

| Reference | Classification | Authority Note / Constraint |
|---|---|---|
| **Broadway Pizza Ordering Website** | **REFERENCE** | Cited in PRD & UI-UX for information architecture, menu categorization, and deal presentation expectations. The product must NOT copy Broadway Pizza's visual identity, logo, wording, imagery, or layout. |
| **Next.js 16 / React 19 Official Documentation** | **EXTERNAL STANDARD** | Technical runtime standard for App Router, server/client components, Cache Components/PPR, and Turbopack. |
| **PostgreSQL 18 Official Documentation** | **EXTERNAL STANDARD** | Relational persistence, constraints, indexing, transactions, and extensions (`citext`, `pgcrypto`). |
| **OWASP Top 10:2025 & OWASP API Top 10:2023** | **EXTERNAL STANDARD** | Application and API security baseline for threat modeling and security verification. |
| **WCAG 2.2 AA & WAI-ARIA Authoring Practices** | **EXTERNAL STANDARD** | Mandatory accessibility standard, especially for focus indicators, keyboard traps, color contrast, and glassmorphism fallbacks. |
| **PCI SSC Guidelines / SAQ A** | **EXTERNAL STANDARD** | Payment architecture compliance standard requiring third-party hosted/embedded payment controls without storing cardholder data. |

---

## 3. Factory Generated Artifacts

| Generated Artifact Path | Classification | Purpose |
|---|---|---|
| `docs/CUSTOMER-ARTIFACT-MAP.md` | **GENERATED** | Traceability mapping of all customer artifacts to domain boundaries. |
| `docs/FACTORY_BASELINE.md` | **GENERATED** | Baseline of the codebase, runtime, and tools. |
| `docs/PROJECT-RISK-PROFILE.md` | **GENERATED** | Risk classification across data, security, scale, and performance. |
| `docs/ASSUMPTIONS.md` | **GENERATED** | Explicit record of assumptions and defaults. |
| `FACTORY_STATE.json` | **GENERATED** | Machine-validated factory state tracking. |
