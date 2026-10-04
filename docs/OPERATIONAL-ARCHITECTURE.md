# Operational Architecture, Observability & Resilience

**Document ID:** FF-OPS-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

---

## 1. Service Level Indicators (SLIs) & Objectives (SLOs)

| Service Area | Indicator (SLI) | Target Objective (SLO) | Measurement Method |
|---|---|---|---|
| **Storefront & Menu** | Successful requests (HTTP 200/304) / Total requests | $\ge 99.9\%$ monthly availability | Edge CDN logs & Synthetic checks |
| **Checkout & Order Creation** | Successful order creations (HTTP 201) / Valid checkout attempts | $\ge 99.95\%$ success rate | Application metric `checkout_success_ratio` |
| **Order Placement Latency** | `POST /api/v1/orders` latency at 95th percentile | $P_{95} \le 800\text{ ms}$ | OpenTelemetry span duration |
| **Payment Webhook Processing** | Webhook acknowledgment latency at 99th percentile | $P_{99} \le 1.5\text{ s}$ | Route handler execution duration |
| **Order Tracking Live Updates** | Latency from status mutation to client SSE event delivery | $P_{95} \le 2.0\text{ s}$ | Outbox dispatcher timestamp delta |
| **Core Web Vitals** | LCP $\le$ 2.5s, INP $\le$ 200ms, CLS $\le$ 0.1 | 75th percentile of all mobile sessions | Real User Monitoring (RUM) & CrUX |

---

## 2. Observability & Telemetry Framework

### 2.1 Structured JSON Logging
Every request generates a structured log entry containing the correlation ID:
```json
{
  "timestamp": "2026-10-04T17:51:00.123Z",
  "level": "info",
  "requestId": "req_01HPX889K...",
  "userId": "usr_9921",
  "route": "/api/v1/orders",
  "method": "POST",
  "statusCode": 201,
  "durationMs": 142,
  "domain": "ordering",
  "orderId": "ord_8821"
}
```

### 2.2 OpenTelemetry Distributed Tracing
- Tracing is initialized at the Next.js edge/middleware layer.
- Trace contexts (`traceparent` header) propagate across internal database transactions, Redis cache lookups, and outbound HTTP calls to payment/geocoding providers.

### 2.3 Operational Health & Diagnostic Endpoints
- `GET /api/health/live`: Liveness probe (verifies process is responsive).
- `GET /api/health/ready`: Readiness probe (checks PostgreSQL connection pool, Redis ping, and migrations status).

---

## 3. Resilience, Retry & Idempotency Engineering

### 3.1 Retry & Backoff Matrix
- **Idempotent Reads:** Retry up to 3 times with exponential backoff and jitter ($100\text{ms} \to 200\text{ms} \to 400\text{ms}$).
- **Non-Idempotent Mutations:** Automatic retries without an `Idempotency-Key` are strictly prohibited. With an idempotency key, retries safely fetch the committed result.
- **Payment Webhook Retries:** Idempotent by design via `payment_events(provider, provider_event_id)` unique constraint. Repeated deliveries return `200 OK` immediately.

### 3.2 Graceful Degradation Strategy
1. **3D Graphic Failure:** If WebGL fails, GPU memory is low, or assets fail to load, the UI gracefully renders the static WebP image without interrupting the user.
2. **Realtime SSE Disconnect:** If the SSE stream drops, the client automatically degrades to HTTP polling at 10-second intervals.
3. **Geocoding API Outage:** If external geocoding times out, the system degrades to postal-code-based delivery zone matching.

---

## 4. Deployment, Rollback & Backup Strategy

### 4.1 Zero-Downtime Deployment
- Next.js application runs as stateless containers behind Cloudflare Edge / load balancer.
- Rolling updates ensure healthy container readiness before routing production traffic.

### 4.2 Database Migration & Rollback Strategy
- Migrations follow the **Expand and Contract** pattern:
  - Additive changes (new tables, nullable columns) deployed first.
  - Application code updated to write to new structures.
  - Old columns dropped only in a subsequent release after backward-compatibility is assured.
- Point-in-Time Recovery (PITR) enabled on managed PostgreSQL with automated daily snapshots and continuous WAL archiving.
