# Project Assumptions & Defaults Register

**Project:** Premium Fast-Food Restaurant Ordering & Brand Website  
**Date:** 2026-10-04  
**Status:** Ingestion Baseline  

## 1. Business & Domain Assumptions
1. **Brand Identity:** The specific brand name, final logo, and color hex codes are marked as TBD in PRD §1/UI-UX §3. The architecture and code will use semantic design tokens (`ink`, `surface-glass`, `accent-red`, `accent-orange`, `accent-yellow`, etc.) so that the brand theme is fully configurable without code rework.
2. **Currency & Locale:** Default currency is configured as USD (or local currency minor units, e.g. cents, 3-char ISO code), with formatters decoupled from business logic.
3. **Guest Checkout Strategy:** Guest checkout is enabled by default (PRD FR-008). Guest orders generate a secure, unguessable tracking token so customers can track orders without logging in.
4. **Service Modes:** Initial supported modes are Delivery and Pickup. Dine-in is explicitly preserved as an architectural extension point without premature implementation.

## 2. Technical & Architecture Assumptions
1. **Database & Connection:** PostgreSQL 18.x with Drizzle ORM. In local development and automated CI, a local PostgreSQL instance or containerized Postgres is used.
2. **Payment Processing:** Payment processing is abstracted via `PaymentProvider`. For development and verification, a standard mock/test provider adapter implementing the exact webhook, intent, and status lifecycle is provided alongside production adapters (e.g. Stripe / custom hosted checkout).
3. **Storage & Media:** Media assets (images, 3D models) will be loaded from local static storage in development and S3-compatible bucket / CDN in production.
4. **Realtime Transport:** SSE (Server-Sent Events) or lightweight WebSocket for order tracking with an automatic polling fallback mechanism (PRD FR-013, Flow §13).
5. **3D Assets:** 3D models are formatted as optimized `.glb` / `.gltf` files with DRACO/meshopt compression and will be lazy-loaded on the About page.

## 3. Human Approval & Governance Invariants
1. All phase progressions adhere strictly to the external approval control under `$HOME\.website-factory-control\approvals`.
2. No human approval is simulated or forged.
3. Once Delivery Plan is approved, implementation proceeds continuously through feature pods with automated and specialist verification waves.
