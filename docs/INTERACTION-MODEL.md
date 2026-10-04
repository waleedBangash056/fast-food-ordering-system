# Interaction Model & State Specifications

**Document ID:** FF-INT-001  
**Version:** 1.0  
**Date:** 2026-10-04  
**Status:** BASELINED  

---

## 1. Interaction State Contract

Every interactive surface, form, and async boundary must implement explicit states:
$$\text{Instant Shell} \to \text{Skeleton / Spinner} \to \text{Active Content} \to \text{Error / Empty Recovery}$$

### State Definitions
- **Idle:** Default state, interactive controls enabled, assets loaded.
- **Loading:** Non-blocking skeleton loaders preserving exact layout height/width to eliminate Cumulative Layout Shift (CLS).
- **Active / Focused:** High-contrast focus outline ($\ge 3:1$ contrast against glass surfaces), tactile press state.
- **Disabled:** Explicit visual cues (reduced opacity, `aria-disabled="true"`), cursor `not-allowed`.
- **Error:** Accessible validation message in text, not color alone; aria-live announcement.
- **Success:** Haptic/visual micro-feedback (e.g., cart count badge increment).
- **Empty:** High-context branded illustrations with positive return CTA.

---

## 2. Interaction State Matrix by Customer Touchpoint

| Surface / Component | Idle State | Loading State | Disabled State | Error State | Empty State |
|---|---|---|---|---|---|
| **Menu Category Nav** | Chips active; active category underlined in `accent-orange`. | Horizontal skeleton chip rail. | Categories without active items hidden. | Retry banner if catalog fetch fails. | N/A (Categories seeded). |
| **Product Card** | Food image, title, price, "Add" button ready. | Card skeleton with image shimmer. | "Sold Out" badge; button disabled. | Fallback placeholder image if URL broken. | N/A. |
| **Modifier Modal / Sheet** | Checkboxes/radios responsive; live subtotal displayed. | Option loading spinner during group switch. | Add-to-cart button disabled until required groups chosen. | In-modal alert: "Please select a required size". | N/A. |
| **Cart Drawer** | Items listed with quantity steppers and subtotal. | Subtotal spinner while applying coupon. | "Checkout" button disabled if cart empty or out-of-stock item present. | Coupon input displays "Invalid coupon code". | Branded illustration: "Your cart is hungry" + "Explore Menu" CTA. |
| **Delivery Address Form** | Address input with autocomplete. | Address geocode spinner; delivery zone calculating. | Submit button locked while calculating delivery quote. | "Address outside delivery area" banner + "Switch to Pickup" button. | N/A. |
| **Checkout Action** | "Pay Now" / "Place Order" button with locked total. | Full-button spinner; input fields locked to prevent edits. | Button disabled if required contact fields invalid. | Payment declined modal with retry option. | N/A. |
| **Order Tracking** | Animated progress bar and active stage highlighted. | Pulse indicator on current status node. | Cancel button disabled once kitchen accepts. | "Connection lost — attempting to reconnect" banner with retry CTA. | "No active orders found" with link to home. |
| **About Page 3D Hero** | Interactive 3D scene responds to scroll/drag. | Optimized WebP poster image displayed immediately. | 3D canvas disabled under `prefers-reduced-motion`. | Graceful fallback to static high-res photography. | N/A. |

---

## 3. High-Impact Action Confirmation Policy

In accordance with Website Factory v7.4.0 standards, native browser `window.confirm`, `window.alert`, and `window.prompt` are strictly prohibited.
- **Order Cancellation:** Custom accessible modal showing order number, cancellation reason dropdown, refund advisory, and destructive action button ("Yes, Cancel Order").
- **Clear Cart:** Custom dialog asking "Remove all items from your cart?".
- **Admin Price / Availability Mutation:** Contextual review dialog displaying the exact before/after price delta and affected branches before commit.
