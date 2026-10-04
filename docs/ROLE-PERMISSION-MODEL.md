# Role & Permission Model — Multi-Dimensional Authorization Matrix

**Document ID:** FF-RBAC-001  
**Version:** 1.1  
**Date:** 2026-10-04  
**Status:** BASELINED & FORMALLY VERIFIED  

---

## 1. Principles of Authorization
- **Deny-by-Default:** Every action on every resource is denied unless explicitly permitted by a rule in this matrix.
- **Multi-Dimensional Policy:** Authorization evaluates `(Principal Role, Resource, Action, Context / Predicate) -> Decision`.
- **UI & Server Parity:** UI controls derive visibility from this matrix; server Route Handlers and Domain Services independently enforce the identical policy.
- **BOLA / IDOR Elimination:** Object-level ownership and branch-level tenancy are mandatory predicates in every data query and mutation.

---

## 2. Multi-Dimensional Authorization Matrix

| Principal (Role) | Target Resource | Action | Context / Condition Predicate | Decision |
|---|---|---|---|---|
| `GUEST` | `Menu / Catalog` | `Read` | Item is active and branch is operational | **ALLOW** |
| `GUEST` | `ContentPage` | `Read` | `page.status == 'PUBLISHED'` | **ALLOW** |
| `GUEST` | `Cart` | `Create / Update` | Session-scoped in-memory cart | **ALLOW** |
| `GUEST` | `Order` | `Create` | Valid cart, qualified delivery zone, `idempotency_key` present | **ALLOW** |
| `GUEST` | `Order` | `Read` | `request.headers['x-tracking-token'] == order.tracking_token` | **ALLOW** |
| `GUEST` | `Order` | `Cancel` | `order.status in ['DRAFT', 'PENDING_PAYMENT']` AND valid tracking token | **ALLOW** |
| `GUEST` | `Order` | `Read / Update` | Any other context | **DENY** |
| `GUEST` | `Admin / Staff` | `Any` | All admin/staff endpoints | **DENY** |
| `CUSTOMER` | `Menu / Content` | `Read` | Same as GUEST | **ALLOW** |
| `CUSTOMER` | `Cart / Order` | `Create` | Same as GUEST | **ALLOW** |
| `CUSTOMER` | `Order` | `Read` | `order.user_id == session.user.id` OR valid `tracking_token` | **ALLOW** |
| `CUSTOMER` | `Order` | `Read` | `order.user_id != session.user.id` AND invalid token | **DENY** |
| `CUSTOMER` | `Order` | `Cancel` | `order.user_id == session.user.id` AND `order.status in ['PENDING_PAYMENT', 'CONFIRMED']` | **ALLOW** |
| `CUSTOMER` | `UserProfile` | `Read / Update` | `user.id == session.user.id` | **ALLOW** |
| `CUSTOMER` | `UserAddress` | `Create / Read / Update / Delete` | `address.user_id == session.user.id` | **ALLOW** |
| `CUSTOMER` | `Admin / Staff` | `Any` | All staff and administrative operations | **DENY** |
| `STAFF` | `Order` | `Read Queue` | `order.branch_id == session.user.branch_id` | **ALLOW** |
| `STAFF` | `Order` | `Read Queue` | `order.branch_id != session.user.branch_id` | **DENY** |
| `STAFF` | `Order` | `Update Status` | `order.branch_id == session.user.branch_id` AND transition in `['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']` | **ALLOW** |
| `STAFF` | `Order` | `Reject / Cancel` | `order.branch_id == session.user.branch_id` AND reason provided | **ALLOW** |
| `STAFF` | `Catalog / Prices`| `Mutate` | Base pricing and menu taxonomy mutations | **DENY** |
| `KITCHEN_OPERATOR` | `Order` | `Read Queue` | `order.branch_id == session.user.branch_id` AND `order.status in ['CONFIRMED', 'ACCEPTED', 'PREPARING']` | **ALLOW** |
| `KITCHEN_OPERATOR` | `Order` | `Advance Status`| `order.branch_id == session.user.branch_id` AND target status in `['ACCEPTED', 'PREPARING', 'READY']` | **ALLOW** |
| `KITCHEN_OPERATOR` | `Order` | `Reject` | `order.branch_id == session.user.branch_id` AND reason recorded | **ALLOW** |
| `KITCHEN_OPERATOR` | `Order` | `Refund / Financial` | Any financial transaction mutation | **DENY** |
| `BRANCH_MANAGER` | `Order` | `All Staff Actions` | `order.branch_id == session.user.branch_id` | **ALLOW** |
| `BRANCH_MANAGER` | `Branch` | `Update Hours` | `branch.id == session.user.branch_id` | **ALLOW** |
| `BRANCH_MANAGER` | `BranchException`| `Create / Delete` | `exception.branch_id == session.user.branch_id` | **ALLOW** |
| `BRANCH_MANAGER` | `BranchMenuItem` | `Toggle Active / Price Override` | `branch_menu_items.branch_id == session.user.branch_id` | **ALLOW** |
| `BRANCH_MANAGER` | `Branch` | `Any Action` | `branch.id != session.user.branch_id` | **DENY** |
| `CONTENT_MANAGER` | `ContentPage` | `Create / Update / Publish` | Global content domain scope | **ALLOW** |
| `CONTENT_MANAGER` | `ContentBlock` | `Create / Update / Reorder` | Global content domain scope | **ALLOW** |
| `CONTENT_MANAGER` | `Orders / Financial` | `Any` | All order, pricing, and payment domains | **DENY** |
| `ADMIN` | `Catalog` | `Create / Update / Delete` | Global catalog scope | **ALLOW** |
| `ADMIN` | `Pricing` | `Update Base Prices` | Global pricing scope (triggers audit log) | **ALLOW** |
| `ADMIN` | `Promotions` | `Create / Update / Disable`| Global promotions scope | **ALLOW** |
| `ADMIN` | `DeliveryZone` | `Create / Update / Polygon`| Global delivery zone scope | **ALLOW** |
| `ADMIN` | `Branches` | `Create / Update` | Global branches scope | **ALLOW** |
| `ADMIN` | `Orders` | `Read / Status Override / Refund` | Global order scope | **ALLOW** |
| `ADMIN` | `UserRoles` | `Mutate Administrative Roles` | Privilege escalation protection | **DENY** |
| `SUPER_ADMIN` | `UserRoles` | `Assign / Revoke Roles` | User management scope | **ALLOW** |
| `SUPER_ADMIN` | `AuditLog` | `Read` | Global security audit scope | **ALLOW** |
| `SUPER_ADMIN` | `AuditLog` | `Update / Delete` | Immutability invariant: audit records cannot be mutated or purged | **DENY** |
| `ALL` | `Any Resource` | `Any Action` | Unmatched role, resource, or failed context predicate | **DENY** |

---

## 3. Object-Level Invariants & Enforcement Mechanism
1. **Customer Tenancy:**
   ```ts
   if (session.role === 'CUSTOMER' && order.userId !== session.userId) {
     throw new NotFoundException(); // Prevents resource enumeration
   }
   ```
2. **Branch Tenancy:**
   ```ts
   if (['STAFF', 'KITCHEN_OPERATOR', 'BRANCH_MANAGER'].includes(session.role)) {
     if (resource.branchId !== session.branchId) {
       throw new ForbiddenException('Branch access restriction');
     }
   }
   ```
3. **Guest Capability Token:**
   ```ts
   if (!session && request.headers['x-tracking-token'] !== order.trackingToken) {
     throw new NotFoundException();
   }
   ```
