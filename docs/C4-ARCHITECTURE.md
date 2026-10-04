# C4 Architecture Model — Premium Fast-Food Restaurant

**Document ID:** FF-C4-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

---

## Level 1: System Context Diagram

```mermaid
flowchart TD
    Customer["Customer (Guest / Authenticated)"]
    Staff["Branch Staff"]
    Kitchen["Kitchen Operator"]
    Admin["Restaurant Admin / Manager"]
    
    Monolith["Premium Fast-Food Monolith\n(Next.js 16 + Node.js)"]
    
    PaymentGateway["Payment Provider\n(Hosted Checkout / Webhooks)"]
    CDN["Edge CDN + WAF\n(Cloudflare)"]
    MapsProvider["Maps / Geocoding Service\n(Address Verification)"]
    MessagingProvider["Messaging Service\n(SMS / Email Notifications)"]
    
    Customer -->|Visits & Orders [HTTPS]| CDN
    CDN -->|Forwards to origin [HTTPS]| Monolith
    Staff -->|Manages orders [HTTPS]| Monolith
    Kitchen -->|Manages prep queue [HTTPS]| Monolith
    Admin -->|Administers catalog & branches [HTTPS]| Monolith
    
    Monolith -->|Creates payment intents & verifies webhooks [HTTPS]| PaymentGateway
    Monolith -->|Geocodes delivery addresses [HTTPS]| MapsProvider
    Monolith -->|Dispatches transactional alerts [HTTPS]| MessagingProvider
```

---

## Level 2: Container Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Devices"]
        Browser["Browser Web App\n(React 19, Tailwind, GSAP, R3F)"]
    end

    subgraph OriginInfrastructure ["Application & Persistence Infrastructure"]
        CDN_WAF["Cloudflare CDN & Edge WAF"]
        
        NextServer["Next.js Application Server\n(App Router, Route Handlers, RSC)"]
        
        Postgres[("PostgreSQL 18 Database\n(Normalized System of Record)")]
        RedisStore[("Redis\n(Cache & Distributed Locks)")]
        ObjectStorage[("S3 Object Storage / Image CDN\n(Food Media & 3D Assets)")]
    end

    subgraph ExternalServices ["External Providers"]
        StripeGateway["Payment Provider (Stripe)"]
        GeocodeAPI["Maps / Geocoding API"]
        EmailSMS["Email & SMS Provider"]
    end

    Browser -->|HTTPS / JSON| CDN_WAF
    CDN_WAF -->|Dynamic Requests| NextServer
    CDN_WAF -->|Cached Media / Static Assets| ObjectStorage

    NextServer -->|Drizzle ORM / SQL| Postgres
    NextServer -->|Key-Value / TCP| RedisStore
    NextServer -->|Media Uploads / S3 API| ObjectStorage

    NextServer -->|Payment Intents / REST| StripeGateway
    StripeGateway -->|Asynchronous Webhooks [HTTPS]| NextServer
    NextServer -->|Geocoding / REST| GeocodeAPI
    NextServer -->|Notification Triggers / REST| EmailSMS
```

---

## Level 3: Component Diagram (Next.js Application Container)

```mermaid
flowchart TD
    subgraph NextApp ["Next.js Server Application Container"]
        Catalog["Catalog Component\n(Categories, MenuItems, Modifiers)"]
        Pricing["Pricing Component\n(Authoritative Minor Units Math)"]
        Promotions["Promotions Component\n(Coupon & Discount Engine)"]
        Ordering["Ordering Component\n(Cart Validation & Order Aggregate)"]
        Delivery["Delivery Component\n(Zones, Distance, Branch Hours)"]
        Payments["Payments Component\n(PaymentProvider Adapter & Webhooks)"]
        Customers["Customers Component\n(Auth, Roles, Saved Addresses)"]
        Content["Content Component\n(Structured Pages & CMS Blocks)"]
        Operations["Operations Component\n(Staff Queues, Audit Logging, Support)"]
        OutboxWorker["Transactional Outbox Worker\n(Event Dispatcher)"]
    end

    subgraph DataStorage ["Data Stores"]
        DB[(PostgreSQL 18)]
        Cache[(Redis Cache)]
    end

    Ordering --> Catalog
    Ordering --> Pricing
    Ordering --> Promotions
    Ordering --> Delivery
    Ordering --> Payments
    Ordering --> Customers

    Catalog --> DB
    Catalog --> Cache
    Ordering --> DB
    Payments --> DB
    Delivery --> DB
    Operations --> DB

    Ordering -->|Writes domain event in ACID transaction| DB
    OutboxWorker -->|Polls order_events table| DB
```

---

## Level 4: Deployment Diagram

```mermaid
flowchart TD
    subgraph PublicInternet ["Public Internet"]
        UserDevice["Client Web Browser (Desktop / Mobile)"]
    end

    subgraph EdgeTier ["Edge Infrastructure"]
        CloudflareEdge["Cloudflare Edge Network\n(DDoS Protection, Global CDN, SSL Termination)"]
    end

    subgraph AppTier ["Application Compute Tier"]
        ContainerInstance1["Next.js Node.js Container #1\n(Stateless Web & API)"]
        ContainerInstance2["Next.js Node.js Container #2\n(Stateless Web & API)"]
    end

    subgraph PersistenceTier ["Persistence & Cache Tier"]
        ManagedPG[("Managed PostgreSQL 18\n(Primary with Automated Backups)")]
        ManagedRedis[("Managed Redis 7 Cluster\n(In-memory Cache & Rate Limiting)")]
        S3Bucket[("Cloud Object Storage S3\n(Media & 3D GLB Models)")]
    end

    UserDevice -->|HTTPS / TLS 1.3| CloudflareEdge
    CloudflareEdge -->|Reverse Proxy / Keep-Alive| ContainerInstance1
    CloudflareEdge -->|Reverse Proxy / Keep-Alive| ContainerInstance2
    CloudflareEdge -.->|Static Cache / Media| S3Bucket

    ContainerInstance1 -->|Connection Pooling| ManagedPG
    ContainerInstance2 -->|Connection Pooling| ManagedPG
    ContainerInstance1 -->|TCP Connection| ManagedRedis
    ContainerInstance2 -->|TCP Connection| ManagedRedis
```
