# App Flow — Customer, Brand, Checkout & Operations

**Document ID:** FF-FLOW-001  
**Version:** 1.0  
**Status:** Interaction Baseline

## 1. Global Customer Flow

```mermaid
flowchart TD
    A[Open Website] --> B[Home / Menu]
    B --> C{Choose path}
    C -->|Order| D[Browse Categories]
    C -->|Brand| E[About / Story]
    C -->|Find branch| F[Locations]
    C -->|Offers| G[Offers]

    D --> H[Product Detail]
    H --> I[Customize]
    I --> J[Add to Cart]
    J --> K[Cart]
    K --> L{Continue shopping?}
    L -->|Yes| D
    L -->|No| M[Checkout]
    M --> N[Service Mode]
    N --> O[Branch / Address]
    O --> P[Delivery Validation]
    P --> Q[Payment]
    Q --> R{Payment result}
    R -->|Success| S[Order Confirmation]
    R -->|Fail| T[Retry / Change Method]
    T --> Q
    S --> U[Order Tracking]
```

## 2. Home/Menu Flow

### Step 1 — Arrival

The user sees branded food imagery and immediately understands the restaurant and the ordering action.

### Step 2 — Service location

If pricing/availability depends on location, request branch/address early enough to avoid showing invalid products while preserving a quick browse option where possible.

### Step 3 — Browse

Use category navigation and featured promotions.

### Step 4 — Select

Click/tap a product card.

### Step 5 — Customize

Display required modifier groups first, then optional groups.

### Step 6 — Add

CTA shows resulting total. Cart count updates immediately.

## 3. Product Flow

```mermaid
flowchart LR
    A[Product Card] --> B[Product Detail]
    B --> C{Has required modifiers?}
    C -->|No| D[Choose quantity]
    C -->|Yes| E[Complete modifiers]
    E --> F{Valid?}
    F -->|No| E
    F -->|Yes| D
    D --> G[Add to Cart]
```

## 4. Cart Flow

```mermaid
flowchart TD
    A[Cart Open] --> B[Review Items]
    B --> C{Edit item?}
    C -->|Yes| D[Edit Product]
    D --> B
    C -->|No| E[Coupon]
    E --> F[Recalculate Totals]
    F --> G{Service mode}
    G --> H[Delivery]
    G --> I[Pickup]
    H --> J[Checkout]
    I --> J
```

## 5. Checkout Flow

```mermaid
flowchart TD
    A[Checkout] --> B[Identify Customer]
    B --> C[Select Delivery/Pickup]
    C --> D[Address/Branch]
    D --> E[Validate Serviceability]
    E --> F{Serviceable?}
    F -->|No| G[Change Address/Branch]
    G --> D
    F -->|Yes| H[Choose Time]
    H --> I[Review Order]
    I --> J[Payment]
    J --> K{Result}
    K -->|Success| L[Create/Confirm Order]
    K -->|Failure| M[Payment Error]
    M --> N[Retry / Alternative Method]
    N --> J
    L --> O[Confirmation]
```

## 6. Order State Flow

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT
    PENDING_PAYMENT --> PAYMENT_FAILED
    PENDING_PAYMENT --> PAID
    PAID --> CONFIRMED
    CONFIRMED --> ACCEPTED
    ACCEPTED --> PREPARING
    PREPARING --> READY
    READY --> OUT_FOR_DELIVERY
    READY --> DELIVERED
    OUT_FOR_DELIVERY --> DELIVERED

    CONFIRMED --> CANCELLED
    ACCEPTED --> CANCELLED
    PREPARING --> CANCELLED

    PAID --> REFUNDED
    DELIVERED --> [*]
    CANCELLED --> [*]
    REFUNDED --> [*]
    PAYMENT_FAILED --> [*]
```

Actual permitted transitions should be implemented in a domain state machine rather than inferred from arbitrary UI buttons.

## 7. About / Brand Story Flow

```mermaid
flowchart TD
    A[About Entry] --> B[Cinematic Hero]
    B --> C[Brand Statement]
    C --> D[Ingredient Story]
    D --> E[Craft / Preparation]
    E --> F[Timeline]
    F --> G[Locations]
    G --> H[Final CTA]
    H --> I[Order Now]
```

The narrative should gradually increase emotional commitment while allowing users to jump to ordering.

## 8. Authentication Flow

```mermaid
flowchart TD
    A[Account] --> B{Existing session?}
    B -->|Yes| C[Account Home]
    B -->|No| D[Sign In / Guest]
    D --> E[Email/Phone + Credential]
    E --> F{Valid?}
    F -->|No| G[Error / Recovery]
    G --> E
    F -->|Yes| C
```

Guest checkout should remain available unless explicitly removed by business policy.

## 9. Reorder Flow

```text
Account → Orders → Select Previous Order → Revalidate Current Menu → Revalidate Modifiers/Availability → Add Valid Items → Cart → Checkout
```

A reorder is a fresh order attempt, not a copy of the old order state.

## 10. Location Flow

```mermaid
flowchart TD
    A[Locations] --> B[Branch List]
    B --> C[Branch Detail]
    C --> D[Hours]
    C --> E[Address / Map]
    C --> F[Order from this Branch]
```

Branch information must come from the authoritative branch model so operational closures are reflected consistently.

## 11. Admin Flow

```mermaid
flowchart TD
    A[Admin Login] --> B[Dashboard]
    B --> C[Orders]
    B --> D[Menu]
    B --> E[Branches]
    B --> F[Promotions]
    B --> G[Content]
    B --> H[Customers]
    B --> I[Analytics]
    B --> J[Audit Log]
```

## 12. Admin Order Flow

```mermaid
flowchart TD
    A[Incoming Order] --> B[Review]
    B --> C{Accept?}
    C -->|No| D[Reject + Reason]
    C -->|Yes| E[Accepted]
    E --> F[Preparing]
    F --> G[Ready]
    G --> H{Service Mode}
    H -->|Pickup| I[Ready for Pickup]
    H -->|Delivery| J[Out for Delivery]
    I --> K[Completed]
    J --> K
```

Every staff status change is recorded in `order_status_history` and should also generate an order event when customer communication depends on it.

## 13. Failure Flows

### Payment failure

Never create an extra order merely because the customer retries payment.

### Network timeout during order creation

The client retries using the same idempotency key and retrieves the existing result.

### Menu item becomes unavailable after cart creation

Checkout revalidates and clearly identifies the changed item instead of silently changing the customer's selection.

### Branch closes while checkout is open

Server validation blocks order creation and offers another branch/service mode where appropriate.

### Realtime connection lost

Tracking falls back to periodic refresh/polling.

### 3D asset failure

Show static image or simplified scene; ordering continues.

## 14. SEO/Discovery Flow

Search engines should primarily discover:

- Home/menu
- category pages where indexable
- location pages
- About/brand pages
- promotional landing pages
- FAQ/legal pages where appropriate

Private/order/account routes must not become the principal SEO surface.
