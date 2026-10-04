# Interaction Matrix - Premium Fast-Food Restaurant

**Document ID:** FF-INT-001  
**Version:** 1.0  
**Date:** 2026-10-04  

## 1. Storefront Interactions
| Surface | Action | Context / State | Role | Expected Consequence (UI & API) |
|---|---|---|---|---|
| Menu Catalog | Browse Categories | Any | All | Displays items filtered by category. URL updates. |
| Item Modal | Select Modifiers | Active item modal | All | Enforces min and max selection rules. Price updates dynamically. |
| Item Modal | Add to Cart | Valid modifiers selected | All | Item added to global cart state. Drawer slides out. |
| Cart Drawer | Modify Quantity | Items in cart | All | Recalculates total. If qty = 0, item removed. |
| Cart Drawer | Apply Coupon | Valid coupon | All | Validates code. Applies discount line item. |
| Cart Drawer | Apply Coupon | Expired/Invalid | All | Displays inline error. No cart change. |
| Cart Drawer | Proceed to Checkout | Cart > 0 | All | Transitions to /checkout route. |

## 2. Checkout Interactions
| Surface | Action | Context / State | Role | Expected Consequence (UI & API) |
|---|---|---|---|---|
| Checkout Form | Enter Delivery Info | Form pristine | All | Zod validation on blur. Address autocompletion (if enabled). |
| Checkout Form | Submit Order | Form valid | Guest/Customer | Disables submit button. Initiates Place Order transaction. |
| Checkout Form | Submit Order | Tampered Price Payload | Guest/Customer | API rejects with 400. UI shows fatal error, reloads cart. |
| Order Confirmation | View Status | Order placed | Guest (via token) / Customer | Real-time status polling/websocket updates. |

## 3. Admin / Kitchen Operations
| Surface | Action | Context / State | Role | Expected Consequence (UI & API) |
|---|---|---|---|---|
| Kitchen Dashboard | View Queue | Polling enabled | Admin/Kitchen | Displays PENDING, PREPARING orders sorted by time. |
| Kitchen Dashboard | Mark "Preparing" | Order PENDING | Admin/Kitchen | Order state changes. Customer UI updates via WebSocket. |
| Kitchen Dashboard | Mark "Ready" | Order PREPARING| Admin/Kitchen | Order state changes. SMS/Email notification triggered. |
| Kitchen Dashboard | Cancel Order | Order PENDING | Admin/Kitchen | Refund initiated (if paid). State changes to CANCELLED. |
| Kitchen Dashboard | Cancel Order | Order READY | Admin/Kitchen | Action rejected or requires Manager override. |

## 4. Alternate Entry Paths & Deep Links
| Surface | Action | Context / State | Role | Expected Consequence (UI & API) |
|---|---|---|---|---|
| Tracking Deep Link | Access /order/[id] | Valid tracking token | Guest | Displays order status without requiring login. |
| Tracking Deep Link | Access /order/[id] | No token, Guest | Guest | Redirects to home or displays 404 (prevent IDOR). |
| Tracking Deep Link | Access /order/[id] | Owns order | Customer | Displays order status. |
| Tracking Deep Link | Access /order/[id] | Does not own order| Customer | Displays 404 (prevent IDOR). |
