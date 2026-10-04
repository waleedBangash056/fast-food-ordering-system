# UX Information Architecture — Premium Fast-Food Restaurant

**Document ID:** FF-UX-IA-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** PHASE 04 BASELINED  

---

## 1. Information Architecture Tree

```text
├── Storefront
│   ├── Home / Menu Discovery (/)
│   ├── Category Filtered Menu (/menu/[category])
│   ├── Product Customization Sheet / Modal (/product/[slug])
│   ├── Cart Slide-Over Drawer (/cart)
│   ├── Offers & Combo Deals (/offers)
│   └── Locations & Branch Directory (/locations)
│       └── Branch Detail (/locations/[slug])
├── Checkout & Live Fulfillment
│   ├── Checkout (/checkout)
│   │   ├── 1. Service Mode (Delivery / Pickup)
│   │   ├── 2. Address & Branch Qualification
│   │   ├── 3. Contact & Delivery Timing
│   │   ├── 4. Authoritative Summary
│   │   └── 5. Hosted Payment Embed
│   ├── Order Confirmation (/orders/[id]/confirmation)
│   └── Live Order Tracking (/orders/[id]/track)
├── Brand Experience
│   ├── About & Craft Storytelling (/about)
│   ├── Support & Inquiries (/contact)
│   ├── FAQ (/faq)
│   └── Legal (Privacy & Terms) (/privacy, /terms)
├── Customer Account
│   ├── Sign In / Registration (/auth/login, /auth/register)
│   ├── Account Dashboard (/account)
│   ├── Saved Addresses (/account/addresses)
│   └── Order History & Reorder (/account/orders)
└── Operations & Staff
    ├── Admin Dashboard (/admin)
    ├── Incoming Orders Board (/admin/orders)
    ├── Kitchen Preparation Terminal (/admin/kitchen)
    ├── Menu & Pricing Management (/admin/menu)
    ├── Branch Availability & Exceptions (/admin/branches)
    ├── Promotion & Coupon Manager (/admin/promotions)
    ├── Structured Content CMS (/admin/content)
    └── Security Audit Log Viewer (/admin/audit-logs)
```

---

## 2. Route & Page Purpose Map

| Route | Primary Intent & Goal | Dominant CTA | Core Surfaces & Components |
|---|---|---|---|
| `/` | Food-first landing; immediate appetite stimulation and instant menu discovery. | "Order Now" / Category Jump | Hero food photography, Category Chips, Trending Combo Deals, Featured Grid. |
| `/menu/[category]` | Focused browsing of specific category items (Burgers, Pizzas, Sides, Shakes). | "Add to Cart" | Category tab bar, Product Cards with image, dietary badges, base price. |
| `/product/[slug]` | Product customization without losing menu context. | "Add to Cart — $XX.XX" (Dynamic) | Modal/drawer on desktop, bottom sheet on mobile; modifier selector, allergen pills. |
| `/cart` | Review items, adjust quantities, apply coupons, select delivery vs pickup. | "Proceed to Checkout" | Right slide-over glass drawer; quantity stepper, coupon input, subtotal, delivery quote. |
| `/checkout` | Calm, friction-free conversion funnel; zero distractive 3D graphics. | "Place Order & Pay" | Multi-step form, sticky order summary (desktop), address geocode validator, payment frame. |
| `/orders/[id]/track` | Reassuring, live status updates post-checkout. | "Need Help?" / Reorder | Animated progress line, textual state indicator, estimated delivery countdown, live map. |
| `/about` | Cinematic brand narrative, ingredient sourcing, and preparation craft. | "Taste the Story" (Order CTA) | Parallax hero, pinned GSAP scroll timeline, lazy-loaded 3D ingredient cluster. |
| `/locations` | Find nearby restaurants, view hours, delivery polygons, and contact numbers. | "Order from this Branch" | Interactive map, branch status badges ("Open Now" / "Closed"), address cards. |

---

## 3. Role-Specific User Journeys

### A. Guest Customer (Frictionless Conversion)
$$\text{Arrival at } / \to \text{Browse Categories} \to \text{Customize Item} \to \text{Add to Cart} \to \text{Open Checkout} \to \text{Enter Delivery Details} \to \text{Pay via Hosted Frame} \to \text{Track Order (via Token)}$$
- Zero forced registration. High-entropy UUID tracking token issued automatically.

### B. Authenticated Customer (Fast Reorder)
$$\text{Sign In} \to \text{Account Dashboard} \to \text{1-Click Reorder} \to \text{Auto-Fill Saved Address} \to \text{One-Step Checkout} \to \text{Order Track}$$

### C. Kitchen Operator (Order Terminal)
$$\text{Kitchen Dashboard } (/admin/kitchen) \to \text{Order Appears in Queue} \to \text{Click 'Accept'} \to \text{Click 'Start Prep'} \to \text{Click 'Ready for Handover'}$$

---

## 4. Exception & Failure Flows

1. **Sold-Out Item in Cart:** When opening checkout, server revalidates stock. If an item depleted, checkout halts with an amber alert: *"Item 'Double Truffle Burger' is now sold out."* User can remove or swap without losing the rest of the cart.
2. **Branch Closes During Checkout:** If closing time passes before payment confirmation, checkout halts: *"Branch closed at 10:00 PM. Please switch to Pickup or select an alternate branch."*
3. **Out-of-Zone Delivery Address:** Address geocoder identifies address is outside polygon: *"We cannot deliver to this address yet. Would you like to switch to Pickup?"*
4. **Payment Decline:** In-modal error message with clear reason (insufficient funds, invalid zip). Order stays in `PENDING_PAYMENT` without generating duplicate order IDs.
5. **Realtime Disconnect:** If SSE drops on `/orders/[id]/track`, client quietly falls back to 10-second polling with zero disruptive error modals.
