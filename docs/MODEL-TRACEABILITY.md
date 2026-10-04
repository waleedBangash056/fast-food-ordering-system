# Model Traceability Matrix

**Document ID:** FF-MOD-TRACE-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

This matrix maps every functional requirement (FR-001 through FR-020) and system rule to its corresponding domain aggregate, relational database tables, state machine transitions, API endpoints, and role permissions.

| Requirement ID | Bounded Context | Domain Aggregate | Database Tables | Behavior / State Machine | Primary API Endpoint | Enforced Permissions |
|---|---|---|---|---|---|---|
| **FR-001** (Menu Discovery) | Catalog | `MenuItem`, `Category` | `categories`, `menu_items` | Catalog Browsing | `GET /api/v1/menu` | Public (`GUEST`+) |
| **FR-002** (Menu Categories) | Catalog | `Category` | `categories` | Category Filtering | `GET /api/v1/menu/categories` | Public; Admin for mutations |
| **FR-003** (Product Detail) | Catalog | `MenuItem` | `menu_items`, `menu_item_media` | Product Selection | `GET /api/v1/products/:slug` | Public (`GUEST`+) |
| **FR-004** (Modifiers) | Catalog / Pricing | `ModifierGroup` | `modifier_groups`, `modifier_options` | Customization Validation | `GET /api/v1/products/:slug` | Public (`GUEST`+) |
| **FR-005** (Cart Management) | Ordering / Pricing | `Order` (Cart) | Session / In-Memory | Cart Item Lifecycle | `POST /api/v1/cart/validate` | Public (`GUEST`+) |
| **FR-006** (Service Mode) | Delivery / Ordering | `Order` | `orders.service_mode` | Service Mode Qualification | `POST /api/v1/cart/validate` | Public (`GUEST`+) |
| **FR-007** (Delivery Qual.) | Delivery | `Branch`, `DeliveryZone` | `delivery_zones`, `branches` | Delivery Qualification | `POST /api/v1/delivery/quote` | Public (`GUEST`+) |
| **FR-008** (Guest Checkout) | Ordering / Customers | `Order`, `User` | `orders`, `order_items` | Order Placement (Tokenized) | `POST /api/v1/orders` | Public (`GUEST`) |
| **FR-009** (Authentication) | Customers | `User` | `users`, `user_roles`, `user_addresses` | Session / Account | `POST /api/v1/auth/login` | `CUSTOMER`, `ADMIN` |
| **FR-010** (Payments) | Payments | `Payment` | `payments`, `payment_events` | Payment State Machine | `POST /api/v1/payments/intents` | `CUSTOMER` / `GUEST` (via token) |
| **FR-011** (Order Placement) | Ordering | `Order` | `orders`, `order_items`, `order_events` | Order State Machine (`DRAFT` $\to$ `PENDING`) | `POST /api/v1/orders` | `CUSTOMER` / `GUEST` |
| **FR-012** (Order Status) | Ordering | `Order` | `orders`, `order_status_history` | Order State Machine | Domain Service | Role-Specific (`STAFF`, `KITCHEN`) |
| **FR-013** (Order Tracking) | Ordering | `Order` | `orders`, `order_status_history` | Live Status Timeline | `GET /api/v1/orders/:id/events` | Owner `CUSTOMER` / `GUEST` (token) |
| **FR-014** (Promotions) | Promotions | `Promotion` | `promotions`, `coupon_redemptions` | Coupon Application & Redemption | `POST /api/v1/cart/validate` | Public; Admin for management |
| **FR-015** (Branches) | Delivery | `Branch` | `branches`, `branch_hours`, `branch_exceptions` | Location Management | `GET /api/v1/branches` | Public; `BRANCH_MGR` for hours |
| **FR-016** (Brand Content) | Content | `ContentPage` | `content_pages`, `content_blocks` | Structured CMS | `GET /api/v1/content/:slug` | Public; `CONTENT_MGR` / `ADMIN` |
| **FR-017** (About Page 3D) | Content / UI | `ContentPage` | `content_blocks` | Narrative Scroll & 3D Island | Page Route `/about` | Public (`GUEST`+) |
| **FR-018** (Search/Filter) | Catalog | `MenuItem` | `menu_items`, `categories` | Catalog Search | `GET /api/v1/menu?q=` | Public (`GUEST`+) |
| **FR-019** (Support) | Operations | `SupportTicket` | `support_tickets` | Support Ticket Submission | `POST /api/v1/support/tickets` | Public (`GUEST`+) |
| **FR-020** (Audit Logging) | Operations | `AuditLog` | `audit_logs` | Audit Trail Recording | Internal Domain Interceptor | `SUPER_ADMIN` (View only) |
