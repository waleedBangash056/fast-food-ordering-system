# Customer Artifact Map

**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Mapping Version:** 1.0  
**Date:** 2026-10-04  

## 1. Traceability: Customer Artifacts to Engineering Dimensions

| Document | Primary Focus | Key Inputs to Models | Key Inputs to Architecture | Key Inputs to UI/UX | Key Inputs to Verification |
|---|---|---|---|---|---|
| **01-PRD.md** | Business & Functional Scope | Domain concepts: Menu, Modifier, Order, Branch, Promotion, User, Support Ticket. | Modular monolith boundaries, serviceability logic, transaction requirements. | Home/Menu first-class, search/filter, guest checkout, About narrative page. | Acceptance criteria per FR-001 to FR-020, CWV targets, availability SLI (99.9%). |
| **02-Architecture-and-Design.md** | Architecture & Boundaries | Domain modules: Catalog, Pricing, Promotions, Ordering, Delivery, Payments, Customers, Content, Operations. | Next.js 16 App Router, PostgreSQL 18, Redis cache/rate limits, S3 storage, Outbox table. | Rendering policy per route, glassmorphism surface rules, 3D on-demand rules. | Module boundary enforcement, outbox processing tests, API contract testing. |
| **03-Backend-Schema.md** | Data Model & Persistence | 22 Relational tables, Drizzle ORM definitions, foreign keys, unique constraints, immutable snapshots. | Transaction boundaries (place-order, payment callback), integer minor units money model. | Direct fields powering menus, modifiers, branch hours, delivery zones, order tracking. | Database constraint tests, migration reproducibility, idempotent webhook processing. |
| **04-UI-UX.md** | Visual System & Interaction | State states (loading, empty, error, success), modifier selection rules, cart drawer. | Token system (CSS vars), font pairing (Display + UI), glassmorphism fallback requirements. | Visual appetite hierarchy, glassmorphism specs, responsive breakpoints (360px to 1440px+), About narrative sections 1-7. | WCAG 2.2 AA audit, visible focus, touch target checks (>=44x44px), reduced motion mode. |
| **05-TRD.md** | Technical Specifications | Technology contracts: Next.js 16, React 19, TypeScript 5, Drizzle, PostgreSQL 18, Tailwind, GSAP, R3F. | API /api/v1 routes, Zod validation, CSRF/CSP headers, structured JSON logging, OpenTelemetry. | Image optimization rules, 3D memory disposal and fallback, Core Web Vitals budgets. | Vitest unit/integration, Playwright E2E, Axe accessibility, Lighthouse performance, CI/CD pipeline. |
| **06-App-Flow.md** | Workflows & State Machines | Order state machine: DRAFT -> PENDING_PAYMENT -> PAID -> CONFIRMED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED (and terminal states). | Serviceability check flow, payment retry flow, reorder validation flow, staff order workflow. | Step-by-step UX flows: arrival, category browse, item customizer, cart drawer, checkout steps, live tracking. | State machine transition matrix tests (allowed vs illegal transitions), network retry tests. |
| **07-Implementation-Plan.md** | Vertical Slice Execution | Definition of done, 12 vertical delivery phases, parallel workstream rules. | Incremental delivery order: Foundation -> Catalog -> Cart -> Checkout -> Orders -> Admin -> Brand -> Performance -> Security -> Production. | Staged UI deliverables, starting from core storefront to About 3D storytelling. | Parallel test lanes A-G, release candidate checklist, staging migration rehearsals. |

---

## 2. Cross-Artifact Consistency Analysis

1. **Order State Machine:**
   - `01-PRD.md` (§7, FR-012) defines `DRAFT → PENDING_PAYMENT → PAID/CONFIRMED → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED`.
   - `06-App-Flow.md` (§6) diagrams the state transitions and distinguishes `PAID` followed by `CONFIRMED`.
   - `03-Backend-Schema.md` (§7, `orders.status` & `order_status_history`) aligns with these exact state enumerations.
   
2. **Pricing & Currency Invariants:**
   - `01-PRD.md` (§8), `02-Architecture-and-Design.md` (§4), and `03-Backend-Schema.md` (§1) all strictly agree: Money must be stored and computed as integer minor units (`base_price_minor`, `price_delta_minor`, `total_minor`). Server is authoritative; client-submitted totals are NEVER trusted.

3. **Payment Model:**
   - All customer documents require a provider-agnostic adapter (`PaymentProvider`) with PCI SAQ A eligibility (no credit card data stored locally).

4. **3D & Motion Strategy:**
   - Consistent across `01-PRD.md`, `02-Architecture-and-Design.md`, `04-UI-UX.md`, and `05-TRD.md`: 3D is an editorial/narrative enhancement primarily on the About page and selective brand moments. It must never block the ordering critical path, must have a mobile fallback, must respect `prefers-reduced-motion`, and must dispose GPU resources cleanly.
