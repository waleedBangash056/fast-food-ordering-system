# Security Verification Matrix - Premium Fast-Food Restaurant

**Document ID:** FF-SEC-001  
**Version:** 1.0  
**Date:** 2026-10-04  

## Mapping Threats to Executable Tests
This matrix maps identified threats from THREAT-MODEL.md to specific, automated tests that must pass in the CI/CD pipeline.

| Threat | Target Surface | Verification Strategy | Automation Tool | Expected Result |
|---|---|---|---|---|
| **Price Tampering** | Checkout API (POST /api/checkout) | Inject synthetic payload with 	otal_price: 1.00. | API Test (Vitest) | HTTP 400 Bad Request or Recalculated total overrides input. |
| **Price Tampering** | Modifier Selection | Submit negative price modifiers. | API Test (Vitest) | HTTP 400 Bad Request. |
| **BOLA / IDOR** (Order Tracking) | Order API (GET /api/orders/[id]) | User A requests User B's order ID. | API Test (Vitest) | HTTP 404 Not Found. |
| **BOLA / IDOR** (Guest Tracking) | Order API (GET /api/orders/[id]) | Request without valid x-tracking-token. | API Test (Vitest) | HTTP 404 Not Found or 403 Forbidden. |
| **Webhook Spoofing** | Webhook Endpoint (POST /api/webhooks/stripe) | Send payload without valid Stripe signature header. | API Test (Vitest) | HTTP 400 Bad Request. |
| **Webhook Replay / Idempotency** | Webhook Endpoint | Resend identical, valid signed webhook payload. | API Test (Vitest) | HTTP 200 OK, but outbox/state remains unchanged (no duplicate events). |
| **Rate Limiting / DoS** | Coupon Redemption | Fire 50 concurrent requests for single-use coupon. | Load Test (k6) / Integration | 1 success, 49 failures (HTTP 429 or 409 Conflict). |
| **Rate Limiting / DoS** | Menu API (GET /api/menu) | Fire 2000 req/sec. | Load Test (k6) | WAF / Edge returns HTTP 429 Too Many Requests after threshold. |
| **Privilege Escalation** | Profile Update API | Inject "role": "ADMIN" in update payload. | API Test (Vitest) | Zod strict validation strips property; role remains CUSTOMER. |
| **Cross-Tenant Data Bleeding (Cache)** | Order API / Edge Cache | Fetch order with token, inspect Cache-Control headers. | E2E Security Test | Headers MUST contain private, no-cache, no-store. |
| **Stored XSS** | Special Instructions | Submit payload <script>alert(1)</script> in instructions. | UI Test (Playwright) | Dashboard renders encoded text: &lt;script&gt;alert(1)&lt;/script&gt;. |
| **SQL Injection** | Search / Filter API | Inject ' OR 1=1 -- in search queries. | API Test (Vitest) | ORM escapes input; returns no results or safe query execution. |

## Execution Requirements
- Security tests must run on every PR via GitHub Actions.
- Failure in any Ring G (Security) test mandates an immediate build failure and blocks merging.
- False positives in IDOR/BOLA tests (e.g., returning 403 instead of 404) must be corrected to 404 to prevent resource enumeration.
