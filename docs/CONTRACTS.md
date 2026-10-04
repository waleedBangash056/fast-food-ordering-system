# Contracts & API Specifications

**Document ID:** FF-CONTR-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

---

## 1. Global API Conventions

### Base Path & Transport
- Base URL: `/api/v1`
- Content Type: `application/json; charset=utf-8`
- Correlation ID: `x-request-id` returned on every response.
- Idempotency: `Idempotency-Key` (UUIDv4) required on all state-mutating requests (`POST /orders`, `POST /payments/intents`).

### Standard Machine-Readable Error Schema
```json
{
  "error": {
    "code": "DELIVERY_NOT_SERVICEABLE",
    "message": "This address is outside the delivery area.",
    "requestId": "req_01HPX7...",
    "details": []
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `DELIVERY_NOT_SERVICEABLE` (422)
- `ITEM_OUT_OF_STOCK` (409)
- `MODIFIER_RULE_VIOLATION` (422)
- `INVALID_COUPON` (422)
- `IDEMPOTENCY_CONFLICT` (409)
- `RATE_LIMIT_EXCEEDED` (429)
- `INTERNAL_SERVER_ERROR` (500)

---

## 2. API Endpoints Contract

### 2.1 Storefront & Catalog
- `GET /api/v1/menu`
  - Query: `branchId` (optional UUID)
  - Returns: `{ categories: Category[], products: Product[], version: string }`
  - Cache: `s-maxage=3600, stale-while-revalidate=86400` with tag `catalog`
- `GET /api/v1/menu/categories`
  - Returns: `Category[]`
- `GET /api/v1/products/:slug`
  - Returns: `ProductDetail` with allergen tags, images, and modifier groups.

### 2.2 Cart Validation & Delivery Quote
- `POST /api/v1/cart/validate`
  - Request: `{ branchId: UUID, serviceMode: 'DELIVERY'|'PICKUP', items: CartItem[], couponCode?: string }`
  - Returns: `{ isValid: boolean, subtotalMinor: number, discountMinor: number, deliveryFeeMinor: number, taxMinor: number, totalMinor: number, issues?: ValidationIssue[] }`
- `POST /api/v1/delivery/quote`
  - Request: `{ latitude: number, longitude: number, street: string }`
  - Returns: `{ isServiceable: boolean, branchId?: UUID, branchName?: string, deliveryFeeMinor?: number, estimatedMinutesMin?: number, estimatedMinutesMax?: number }`

### 2.3 Orders & Tracking
- `POST /api/v1/orders`
  - Headers: `Idempotency-Key: <UUIDv4>`
  - Request:
    ```json
    {
      "customerName": "Jane Doe",
      "customerPhone": "+1234567890",
      "customerEmail": "jane@example.com",
      "serviceMode": "DELIVERY",
      "branchId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "deliveryAddress": {
        "street": "123 Main St",
        "city": "Metropolis",
        "postalCode": "10001",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "instructions": "Leave at front desk"
      },
      "items": [
        {
          "productId": "3a1deb4d-...",
          "quantity": 2,
          "modifierOptionIds": ["5c1deb4d-..."],
          "specialInstructions": "Extra crispy"
        }
      ],
      "couponCode": "WELCOME10"
    }
    ```
  - Response (201 Created):
    ```json
    {
      "orderId": "uuid",
      "orderNumber": "ORD-20261004-9821",
      "trackingToken": "uuid",
      "status": "PENDING_PAYMENT",
      "totalMinor": 2450,
      "currency": "USD"
    }
    ```
- `GET /api/v1/orders/:id`
  - Headers: `Authorization: Bearer <token>` OR `x-tracking-token: <UUID>`
  - Response (200 OK): Complete order object with immutable line items, modifiers, status history, and totals.
- `GET /api/v1/orders/:id/events`
  - Transport: Server-Sent Events (`text/event-stream`)
  - Emits: Realtime order status changes.
- `POST /api/v1/orders/:id/cancel`
  - Request: `{ "reason": "Customer requested cancellation" }`
  - Response: Updated order with status `CANCELLED`.

### 2.4 Payment Adapter Endpoints
- `POST /api/v1/payments/intents`
  - Headers: `Idempotency-Key: <UUIDv4>`
  - Request: `{ "orderId": "uuid" }`
  - Response (201 Created): `{ "clientSecret": "pi_...", "amountMinor": 2450, "currency": "USD", "provider": "stripe" }`
- `POST /api/v1/payments/webhooks/:provider`
  - Headers: Provider signature header (e.g. `Stripe-Signature`)
  - Processing: Verifies signature $\to$ checks `payment_events(provider, provider_event_id)` uniqueness $\to$ transitions Order to `PAID` $\to$ commits transaction $\to$ returns 200 OK.

---

## 3. Transactional Outbox Event Contracts

Events written to `order_events` table during business transactions:

### `order.created`
```json
{
  "eventId": "uuid",
  "eventType": "order.created",
  "aggregateId": "order_uuid",
  "payload": {
    "orderId": "uuid",
    "orderNumber": "ORD-20261004-9821",
    "branchId": "uuid",
    "totalMinor": 2450,
    "serviceMode": "DELIVERY",
    "customerPhone": "+1234567890"
  },
  "timestamp": "2026-10-04T16:15:00.000Z"
}
```

### `order.status_changed`
```json
{
  "eventId": "uuid",
  "eventType": "order.status_changed",
  "aggregateId": "order_uuid",
  "payload": {
    "orderId": "uuid",
    "previousStatus": "CONFIRMED",
    "newStatus": "ACCEPTED",
    "actorUserId": "staff_uuid",
    "reason": null
  },
  "timestamp": "2026-10-04T16:20:00.000Z"
}
```

### `payment.succeeded`
```json
{
  "eventId": "uuid",
  "eventType": "payment.succeeded",
  "aggregateId": "order_uuid",
  "payload": {
    "orderId": "uuid",
    "provider": "stripe",
    "providerPaymentId": "pi_123456",
    "amountMinor": 2450
  },
  "timestamp": "2026-10-04T16:15:30.000Z"
}
```
