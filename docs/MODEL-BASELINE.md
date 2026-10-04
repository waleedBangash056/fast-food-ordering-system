# Model Baseline — Master Specification

**Document ID:** FF-MOD-BASE-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** PHASE 02 BASELINED  
**Scope:** Complete Machine-Readable Contract & Domain Specifications  

---

## 1. Executive Summary

Phase 02 Model Baseline establishes the formal, structured contracts governing data, domain logic, workflows, access control, user interactions, and APIs prior to architecture and technology implementation. 

### Core Modeling Deliverables
1. **Domain Model ([`docs/DOMAIN-MODEL.md`](file:///d:/My%20Projects/Fast-Food/docs/DOMAIN-MODEL.md)):** 9 bounded contexts (`Catalog`, `Pricing`, `Promotions`, `Ordering`, `Delivery`, `Payments`, `Customers`, `Content`, `Operations`), aggregate roots, immutable historical snapshots (`order_items`, `order_item_modifiers`, `delivery_address_snapshot`), and integer minor unit currency invariants.
2. **Behavior Models ([`docs/BEHAVIOR-MODELS.md`](file:///d:/My%20Projects/Fast-Food/docs/BEHAVIOR-MODELS.md)):** Rigorous state machine models for Order Lifecycle (including sequential `PAID` $\to$ `CONFIRMED` and `REJECTED`), Payment Lifecycle, Delivery Qualification, Coupon Evaluation, and Cart Item Lifecycle.
3. **Role & Permission Model ([`docs/ROLE-PERMISSION-MODEL.md`](file:///d:/My%20Projects/Fast-Food/docs/ROLE-PERMISSION-MODEL.md)):** Deny-by-default RBAC across 8 roles, explicit capability matrix, BOLA/IDOR prevention, and UI-server permission parity.
4. **Interaction Model ([`docs/INTERACTION-MODEL.md`](file:///d:/My%20Projects/Fast-Food/docs/INTERACTION-MODEL.md)):** Strict state progression (`Instant Shell` $\to$ `Skeleton` $\to$ `Content` $\to$ `Error/Empty`) and action confirmation policy (banning native browser prompts).
5. **Contracts & API Specifications ([`docs/CONTRACTS.md`](file:///d:/My%20Projects/Fast-Food/docs/CONTRACTS.md)):** `/api/v1` route definitions, Zod validation schemas, machine-readable error codes, and transactional outbox event contracts.
6. **Model Traceability ([`docs/MODEL-TRACEABILITY.md`](file:///d:/My%20Projects/Fast-Food/docs/MODEL-TRACEABILITY.md)):** 100% bidirectional mapping between approved requirements FR-001 through FR-020 and domain models.
7. **Quality Model ([`docs/QUALITY-MODEL.md`](file:///d:/My%20Projects/Fast-Food/docs/QUALITY-MODEL.md)):** 8 verification rings (A through H) governing automated and specialist validation.
8. **Enterprise Patterns ([`docs/ENTERPRISE-PATTERNS-ADOPTION.md`](file:///d:/My%20Projects/Fast-Food/docs/ENTERPRISE-PATTERNS-ADOPTION.md)):** Explicit adoption of Broadway Pizza information architecture while rejecting legacy styling and client-side pricing vulnerabilities.

---

## 2. Invariant Sign-Off
- **Money & Math:** Integer minor units only; zero floating-point representation.
- **Server Authority:** Total recalculation strictly on server; client totals are zero-trust.
- **Idempotency:** Unique constraints on `orders.idempotency_key` and `payment_events(provider, provider_event_id)`.
- **PCI Scope:** Hosted/embedded elements; zero local card data.
- **3D Non-Blocking:** LCP candidate is static optimized image; 3D lazy-loads with complete mobile/reduced-motion fallbacks.
