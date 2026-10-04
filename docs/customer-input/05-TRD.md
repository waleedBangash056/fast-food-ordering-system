# TRD — Technical Requirements Document

**Document ID:** FF-TRD-001  
**Version:** 1.0  
**Status:** Engineering Baseline  
**Primary objective:** Build a fast, secure, testable, observable, production-grade restaurant commerce platform with a premium visual frontend.

## 1. Technology Baseline

### Frontend / full-stack framework

- Next.js 16.x
- React 19.x
- TypeScript 5.x
- App Router
- Turbopack for development/build workflow where supported

Next.js 16 is the current stable major line in the official documentation and includes stable Turbopack, Cache Components/PPR, React Compiler support, optimized routing/prefetching, and React 19.2. citeturn513476search0turn513476search2

### UI

- Tailwind CSS or equivalent tokenized CSS system
- Accessible component primitives
- CSS custom properties for design tokens
- Avoid uncontrolled global CSS

### Motion / 3D

- GSAP + ScrollTrigger
- Three.js
- React Three Fiber
- Optional Drei utilities

GSAP ScrollTrigger supports scroll-linked animation features including scrub/pin/snap. React Three Fiber's performance guidance should be followed for resource reuse and controlled rendering. citeturn928003search8turn905846search1

### Backend

- Next.js Route Handlers/server-side modules
- TypeScript domain services
- Zod or equivalent runtime schema validation
- Drizzle ORM
- PostgreSQL 18.x
- Redis-compatible cache/rate-limit store where required

Drizzle supports native PostgreSQL connections, including node-postgres and postgres.js. citeturn928003search13

### Storage

- S3-compatible object storage for uploaded media
- CDN/image optimization in front of media assets

### Observability

- OpenTelemetry-compatible tracing
- Structured application logs
- Error monitoring
- Frontend performance telemetry
- Uptime checks

### Testing

- Unit: Vitest or equivalent
- Integration: database-backed test suite
- E2E: Playwright
- Accessibility: automated axe-style checks + manual keyboard/screen-reader verification
- Performance: Lighthouse/CrUX-style field monitoring + controlled lab budgets

## 2. Supported Browsers

Target current evergreen versions of:

- Chrome
- Edge
- Firefox
- Safari

Do not support obsolete browsers unless business requirements explicitly add them.

## 3. Environment Model

Required environments:

- local
- preview/PR
- staging
- production

Environment variables must be separated by environment and never committed to source control.

## 4. Repository Standards

Recommended structure:

```text
app/
src/
  components/
  features/
  server/
  lib/
  styles/
  types/
db/
  schema/
  migrations/
  seeds/
public/
tests/
  unit/
  integration/
  e2e/
  accessibility/
  performance/
assets/
  3d/
  images/
.github/
```

Keep generated artifacts, test fixtures, source assets, and runtime secrets clearly separated.

## 5. API Requirements

### Transport

HTTP JSON APIs for browser/server boundaries.

### Validation

Every externally supplied payload must be schema-validated before domain logic.

Validate:

- body
- params
- query string
- headers when security-sensitive
- webhook payloads

### API versioning

Use `/api/v1` for externally consumed contracts.

### Idempotency

Require an idempotency key for order creation and any operation where retrying could produce financial duplication.

### Pagination

Use cursor pagination for high-volume resources such as orders and audit logs.

## 6. Security Requirements

The security baseline follows OWASP Top 10:2025 and OWASP API Security Top 10:2023. citeturn928003search1turn928003search3

### Authentication

- secure session mechanism
- strong password hashing where passwords are used
- account recovery
- optional OTP/passkey architecture
- session expiration/revocation
- administrative MFA strongly recommended

### Authorization

- deny by default
- explicit role/permission checks
- object-level authorization on all entity access
- function-level authorization on staff/admin operations

### Browser security

- HTTPS everywhere
- secure cookies
- CSRF protection where cookie-authenticated state-changing requests require it
- Content Security Policy
- clickjacking protection
- strict transport/security headers
- controlled CORS

### Input security

- parameterized SQL/ORM queries
- schema validation
- output encoding/escaping
- safe HTML policy for rich content
- file upload type/size validation
- SSRF protections for any server-side URL fetching

### Secrets

Never place secrets in client bundles, logs, analytics events, or database records that ordinary application roles can access.

## 7. Payment Requirements

Payment handling must be abstracted:

```text
PaymentProvider
  createPaymentIntent()
  verifyWebhook()
  getPaymentStatus()
  refund()
```

The application should avoid storing cardholder data. Where the architecture uses a third-party hosted/embedded payment flow, design against the PCI SSC eligibility rules applicable to that exact integration. citeturn569372search1turn569372search4

## 8. Performance Requirements

### Core Web Vitals

At the 75th percentile:

- LCP ≤ 2.5 s
- INP ≤ 200 ms
- CLS ≤ 0.1

These are the current “good” thresholds published by web.dev. citeturn905846search7

### Frontend budgets

- Avoid shipping 3D libraries to routes that do not require them.
- Lazy-load 3D and heavy animation modules.
- Preload only true critical assets.
- Keep above-the-fold content visually stable.
- Never use unbounded autoplay video on mobile.
- Use responsive image sizes.
- Use route and component-level code splitting.

### CDN

Use CDN caching for static/media assets and safely cacheable public content. Cloudflare documents distributed caching, cache rules, and tiered caching for reducing origin traffic. citeturn928003search6

## 9. Cache Requirements

Use two cache classes:

### Content cache

Longer lived:

- menu
- categories
- public branch data
- About page content
- FAQs

Use tag-based invalidation when admin changes content. Next.js recommends precise tag-based invalidation where possible. citeturn446940search0

### Operational cache

Short-lived:

- delivery quote
- branch availability summary
- rate-limit counters
- session-adjacent data where appropriate

Never use cache as the financial source of truth.

## 10. Database Requirements

- PostgreSQL 18.x
- migrations tracked in source control
- foreign-key constraints
- unique constraints for business invariants
- database transactions for order creation
- row-level locking or equivalent protection where stock/availability race conditions require it
- backup strategy
- point-in-time recovery where supported by provider

## 11. Media/3D Requirements

### Image

Next.js image handling should be used for responsive delivery and layout stability. citeturn446940search1

### 3D

- GLB/GLTF preferred
- textures compressed and size-budgeted
- reuse materials/geometries
- dispose resources when scenes leave lifecycle
- on-demand rendering when possible
- low-quality fallback
- reduced-motion fallback

React Three Fiber explicitly warns against unnecessary object creation and state updates inside frame loops. citeturn905846search1

## 12. Accessibility Requirements

Target WCAG 2.2 AA.

Critical checks:

- keyboard reachability
- visible focus
- screen reader labeling
- semantic structure
- contrast
- form errors
- motion reduction
- zoom/reflow
- touch target usability

WCAG 2.2 is the W3C baseline standard for this project. citeturn569372search9

## 13. Observability Requirements

Every production request must be traceable using a request/correlation identifier.

Required dashboards:

1. Traffic/latency
2. Errors
3. Checkout conversion/failures
4. Payments/webhooks
5. Order lifecycle
6. Database/cache health
7. Core Web Vitals
8. 3D/media failure rates

Alerts:

- elevated 5xx
- checkout error spike
- webhook processing delay
- database saturation
- payment failure spike
- order status queue backlog
- CDN/media failure spike

## 14. Testing Requirements

### Unit

Test pure business rules:

- pricing
- modifiers
- promotion evaluation
- serviceability
- order state machine
- permission rules

### Integration

Test:

- repository/database behavior
- order transaction
- payment callback processing
- event/outbox behavior
- cache invalidation

### E2E

Critical scenarios:

- browse menu
- select product
- customize
- checkout as guest
- payment success
- payment failure/retry
- order tracking
- login/reorder
- admin menu update
- promotion creation/use
- branch availability

### Visual regression

Run on key viewport sizes for:

- home/menu
- product detail
- cart
- checkout
- About page
- order tracking

### Accessibility

Run automated accessibility checks plus manual keyboard navigation and reduced-motion checks.

### Performance

Use both lab and field measurements. Field data matters because real device/network distributions are different from controlled lab conditions. citeturn905846search4

## 15. CI/CD Quality Gates

A pull request must pass, at minimum:

```text
Install
  ↓
Typecheck
  ↓
Lint
  ↓
Unit tests
  ↓
Integration tests
  ↓
Build
  ↓
Security/dependency checks
  ↓
E2E smoke
  ↓
Accessibility smoke
  ↓
Performance budget check
  ↓
Preview deployment
```

Production deployment adds:

- migration safety check
- production build artifact verification
- smoke test
- health checks
- rollback readiness

## 16. Dependency Management

- lockfile committed
- dependency updates through controlled PRs
- security advisories reviewed promptly
- no abandoned critical dependency without recorded decision
- minimize dependency count
- prefer platform/web-standard APIs when a third-party package provides little value

## 17. Reliability Requirements

- graceful loading/error states
- retry with bounded backoff for safe idempotent operations
- no automatic retry of non-idempotent order creation without idempotency key
- webhook retry handling
- circuit/bulkhead behavior for external providers where appropriate
- customer-friendly degradation when non-critical services fail

## 18. SEO Requirements

- metadata per route
- canonical URLs
- Open Graph/Twitter/X metadata where relevant
- sitemap
- robots policy
- structured data for restaurant, menu/product where appropriate
- location pages with accurate branch information
- no indexation of private account/admin routes

## 19. Technology Decision Record — Why This Stack

### Next.js 16

Selected for current full-stack React capabilities, routing, caching, image handling, server/client composition, and strong support for high-performance public pages. citeturn513476search0

### PostgreSQL 18

Selected as the relational source of truth for transactional restaurant commerce. It is currently supported and mature. citeturn569372search5

### Drizzle

Selected for type-safe SQL-oriented access with native PostgreSQL support and relatively low abstraction overhead. citeturn928003search13

### R3F/Three.js + GSAP

Selected because the design requires both 3D and scroll-driven editorial storytelling, while the official ecosystem provides specific performance guidance that can be operationalized in engineering gates. citeturn905846search1turn928003search8
