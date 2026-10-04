# Premium Fast-Food Restaurant — Architecture Baseline

**Document ID:** FF-ARCH-BASE-001  
**Version:** 1.1  
**Date:** 2026-10-04  
**Status:** PHASE 03 BASELINED & AUDITED  
**Architecture Style:** Modular Monolith with Strong Domain Boundaries  

---

## 1. Architectural Principles & System Style

The platform is designed as a **Modular Monolith** executed within Next.js 16.x App Router, backed by PostgreSQL 18.x and Redis.

### Fundamental Principles
1. **Strong Domain Boundaries:** The codebase is cleanly separated into 9 business domains plus a Shared Core (`src/catalog`, `src/pricing`, `src/promotions`, `src/ordering`, `src/delivery`, `src/payments`, `src/customers`, `src/content`, `src/operations`, `src/core`).
2. **ACID Transactional Integrity:** Order formulation, pricing snapshots, stock availability, coupon redemption, and transactional outbox persistence execute within atomic database transactions.
3. **Strict Server Authority:** Client totals are zero-trust. All prices, taxes, discounts, delivery fees, and order amounts are calculated on the server using integer minor units.
4. **Non-Blocking 3D & Performance by Default:** High-impact visual storytelling (Three.js / React Three Fiber / GSAP) is strictly isolated to narrative islands (About page). The commerce critical path uses static optimized images for LCP $\le$ 2.5s.
5. **Decoupled PCI SAQ A Payments:** The application architecture completely abstracts the payment provider (`PaymentProvider`) and uses hosted/embedded elements, ensuring zero cardholder PAN/CVV touches our application servers.
6. **Distributed Idempotency:** State-changing requests (`POST /orders`, `POST /payments/intents`, payment webhooks) enforce distributed idempotency via unique constraints and Redis key locks.
7. **Keyset Cursor Pagination:** Growing datasets (orders, audit logs, tickets) strictly enforce cursor pagination; unbounded queries are prohibited.
8. **Strict Cache Security:** Private customer sessions, tracking tokens, and operational records are strictly forbidden from public edge caching.

---

## 2. Technology Stack Selection

| Layer / Capability | Selected Technology | Version / Standard | Customer Authority Reference |
|---|---|---|---|
| **Frontend Framework** | Next.js App Router | 16.x (Turbopack, PPR/Cache Components) | `02-Arch.md` §3, `05-TRD.md` §1 |
| **UI Library** | React | 19.x (React Server Components, Actions) | `02-Arch.md` §3, `05-TRD.md` §1 |
| **Language** | TypeScript | 5.x (Strict Mode throughout) | `05-TRD.md` §1 |
| **CSS & Design Tokens** | Tailwind CSS | v3/v4 tokenized design variables | `04-UI.md` §3, `05-TRD.md` §1 |
| **Motion & Scroll Story**| GSAP + ScrollTrigger | Current stable | `04-UI.md` §15, `05-TRD.md` §1 |
| **3D Narrative Graphics**| Three.js / React Three Fiber (R3F) | Isolated on-demand rendering | `04-UI.md` §14, `05-TRD.md` §1 |
| **Relational Database** | PostgreSQL | 18.x (System of Record) | `03-Schema.md` §1, `05-TRD.md` §1 |
| **ORM / Data Access** | Drizzle ORM | Native PostgreSQL driver | `03-Schema.md` §1, `05-TRD.md` §1 |
| **Cache & Rate Limiting**| Redis | Redis 7+ / memory adapter | `02-Arch.md` §2, `05-TRD.md` §1 |
| **Testing Toolchain** | Vitest & Playwright | Unit/Integration + E2E + Axe A11y | `05-TRD.md` §14 |

---

## 3. Architectural Decision Records (ADRs)

### ADR-001: Modular Monolith vs Microservices
- **Context:** A restaurant commerce platform requires tightly coupled transactions across inventory, pricing, coupons, delivery qualification, and payment status.
- **Decision:** Adopt a Modular Monolith.
- **Rationale:** Microservices would introduce distributed transaction failure modes (Saga rollback complexity), network latency, and high deployment overhead without justification. Domain modules maintain strict file and contract separation inside one deployable unit, allowing future extraction if scale demands it.

### ADR-002: Next.js 16 App Router & React Server Components
- **Context:** High performance for SEO and public browsing combined with rich client-side interactivity (cart drawer, modifiers modal, interactive 3D narrative).
- **Decision:** Use Next.js 16 App Router with React Server Components (RSC) and tag-based invalidation.
- **Rationale:** RSC renders catalog items on the server with minimal client JavaScript payload ($\le 250$ KB budget), maximizing initial page responsiveness while reserving client interactivity for stateful interactive components.

### ADR-003: PostgreSQL 18 with Drizzle ORM
- **Context:** Transactional restaurant orders require relational data integrity, schema migrations, and high concurrency.
- **Decision:** PostgreSQL 18 with Drizzle ORM.
- **Rationale:** Drizzle provides zero-overhead type-safe SQL queries with explicit transaction control, perfectly suited for the place-order ACID transaction and transactional outbox table.

### ADR-004: Transactional Outbox Pattern for Domain Events
- **Context:** Reliable publishing of domain events (`order.created`, `order.confirmed`, `payment.succeeded`) without dual-write risks.
- **Decision:** Persist events to the `order_events` table in the same database transaction as business mutations.
- **Rationale:** Eliminates event loss if network or notification workers fail during checkout. A lightweight worker polls and publishes outbox events safely.

### ADR-005: On-Demand Three.js & R3F Isolation with Static Image LCP
- **Context:** 3D culinary models add brand prestige but threaten Core Web Vitals (LCP $\le 2.5$s) if loaded globally.
- **Decision:** Isolate 3D to narrative islands (About page) using dynamic imports (`next/dynamic`, `ssr: false`). Use high-resolution static WebP images as the initial LCP candidate.
- **Rationale:** Preserves green Web Vitals while delivering visual excellence. Full fallback to static imagery under `prefers-reduced-motion` or mobile low-power modes.

### ADR-006: Abstracted PaymentProvider with PCI SAQ A Hosted Flow
- **Context:** Cardholder data handling imposes extreme security risks and compliance audits.
- **Decision:** Abstract all payment logic behind `PaymentProvider` interface and utilize third-party hosted/embedded elements (e.g. Stripe Elements).
- **Rationale:** Completely prevents cardholder data from touching our servers, qualifying for PCI DSS SAQ A while maintaining a seamless checkout experience.

### ADR-007: Distributed Idempotency and Deduplication
- **Context:** Network latency and client retries during payment or order submission can cause duplicate orders or double billing.
- **Decision:** Enforce mandatory `Idempotency-Key` headers on state-mutating APIs and deduplicate provider webhooks using unique database indexes on `payment_events(provider, provider_event_id)`.
- **Rationale:** Prevents duplicate charges and ensures at-most-once processing across retries.

### ADR-008: Standardized Cursor-Based Keyset Pagination for High-Volume Collections
- **Context:** High-volume resources (`orders`, `audit_logs`, `support_tickets`) experience continuous growth. Offset-based pagination (`OFFSET N LIMIT M`) incurs $O(N)$ scan penalties and drift under real-time inserts.
- **Decision:** Mandate cursor-based keyset pagination across all growing collections in both API contracts and database indexing.
- **Specification:**
  - Cursor format: URL-safe Base64 encoded JSON string containing `(timestamp, id)`.
  - Query structure: `WHERE (created_at, id) < ($cursor_time, $cursor_id) ORDER BY created_at DESC, id DESC LIMIT $limit`.
  - Database indexes: Composite indexes created specifically to satisfy keyset ordering: `orders(created_at DESC, id DESC)`, `audit_logs(created_at DESC, id DESC)`.
  - Guard: Default page size is 20; maximum capped at 100 to prevent denial-of-service memory exhaustion.
  - Contract Response: `{ items: T[], nextCursor: string | null, hasMore: boolean }`.

### ADR-009: Strict Cache Security & Cross-Tenant Bleed Prevention
- **Context:** Edge CDNs and in-memory caches risk serving cached PII, session data, or order tracking details across different users or tenants (Cache Poisoning / Cross-Tenant Bleed).
- **Decision:** Enforce explicit, deterministic cache classifications:
  - **PUBLIC CACHEABLE:** Public catalog (`/menu`, `/categories`), static brand pages (`/about`), and media assets. Emits `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` with tag-based invalidation.
  - **PRIVATE NON-CACHEABLE:** All user-scoped routes (`/account/*`, `/checkout/*`, `/orders/*`, `/admin/*`). Emits `Cache-Control: private, no-cache, no-store, must-revalidate` and `Pragma: no-cache`.
  - **Edge WAF Guard:** The edge CDN is explicitly configured to strip `Set-Cookie` headers from cacheable responses and bypass cache entirely when an `Authorization` or `Cookie` header is present on dynamic routes.
