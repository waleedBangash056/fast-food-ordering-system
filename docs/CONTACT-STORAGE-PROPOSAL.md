# Persistent Storage & Privacy Architecture Proposal — Contact Inquiries

**Target Application:** Smash & Sizzle (Fast-Food)  
**Target Schema:** `fastfood_app` (PostgreSQL / Supabase)  
**Status:** Proposal for Phase 2 / Post-Baseline Provisioning  

---

## 1. Executive Summary & Rationale

During the final pre-provisioning audit, inspection of `src/app/api/v1/contact/route.ts` revealed that incoming contact inquiries were previously accepted with HTTP 200 without being persisted or forwarded to an upstream email delivery service.

To ensure production integrity and prevent silent data loss:
1. **Immediate Local Defense:** The API endpoint fails closed with `HTTP 503 SERVICE_UNAVAILABLE` by default when no external delivery gateway (e.g. Resend, SendGrid) or database storage provider is configured. The contact page provides prominent fallback channels (`tel:5552345678` and `mailto:support@smashandsizzle.com`).
2. **Audited Baseline Isolation:** The initial 22-table PostgreSQL schema (`drizzle/0000_white_eddie_brock.sql`) and `docs/SUPABASE-ROLE-ISOLATION.sql` remain frozen and verified for immediate Supabase provisioning.
3. **Phase 2 Expansion (This Proposal):** A dedicated `contact_inquiries` table is designed below with strict privacy controls, role permissions, and Row-Level Security (RLS) to be applied as a migration following initial deployment.

---

## 2. Proposed PostgreSQL DDL Specification

```sql
-- Schema: fastfood_app
-- Migration: 0001_add_contact_inquiries.sql (to be run via fastfood_migrator_role)

CREATE TABLE IF NOT EXISTS "fastfood_app"."contact_inquiries" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "message" text NOT NULL,
    "status" text DEFAULT 'RECEIVED' NOT NULL, -- 'RECEIVED', 'ASSIGNED', 'RESOLVED', 'SPAM'
    "assigned_to_user_id" text REFERENCES "fastfood_app"."users"("id") ON DELETE SET NULL,
    "resolution_notes" text,
    "source_ip_hash" text,
    "user_agent" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "resolved_at" timestamp with time zone
);

-- Performance and operational query indexes
CREATE INDEX IF NOT EXISTS "contact_inquiries_status_created_idx" 
    ON "fastfood_app"."contact_inquiries" USING btree ("status", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "contact_inquiries_email_idx" 
    ON "fastfood_app"."contact_inquiries" USING btree ("email");
```

---

## 3. Privacy, Security & Access Control Model

### 3.1 Principle of Least Privilege (Database Roles)
- **`fastfood_runtime_role` (Application Server):**
  ```sql
  GRANT SELECT, INSERT, UPDATE ON "fastfood_app"."contact_inquiries" TO fastfood_runtime_role;
  REVOKE DELETE ON "fastfood_app"."contact_inquiries" FROM fastfood_runtime_role;
  ```
  The runtime application server can insert new inquiries, read them for staff triage, and mark them resolved, but cannot delete records (preventing accidental or malicious data destruction).
- **`PUBLIC` / `anon` / `authenticated`:**
  ```sql
  REVOKE ALL ON "fastfood_app"."contact_inquiries" FROM PUBLIC;
  ```
  Completely inaccessible to unauthorized database roles or Supabase Data APIs.

### 3.2 Role-Based Application Authorization (RBAC)
- **Public / Guest:** Write-only submission through the authenticated Next.js API route (`/api/v1/contact`). Zero read access to any existing records.
- **`STAFF` / `KITCHEN_OPERATOR`:** No access. Kitchen staff and counter staff cannot view customer contact inquiries.
- **`BRANCH_MANAGER` / `ADMIN` / `SUPER_ADMIN`:** Full read and status-update access via authenticated staff sessions (`AUDIT_VIEW` or `SUPPORT_MANAGE` capability).

### 3.3 Data Privacy & Retention Controls
1. **PII Pseudonymization:** Client IP addresses are never stored in plain text. If rate limiting or abuse tracking is needed, store `HMAC-SHA256(ip, SERVER_SALT)` in `source_ip_hash`.
2. **Automated Data Retention & Anonymization Policy:** Customer inquiry messages contain personal identifiers. A pg_cron or Supabase scheduled worker should either purge or completely anonymize all personal data for resolved/spam inquiries older than 90 days:
   
   **Option A: Hard Delete (Recommended for GDPR/CCPA storage limitation):**
   ```sql
   DELETE FROM "fastfood_app"."contact_inquiries"
   WHERE "status" IN ('RESOLVED', 'SPAM')
     AND "created_at" < NOW() - INTERVAL '90 days';
   ```

   **Option B: Complete PII Anonymization (Retains statistical volume metrics):**
   ```sql
   UPDATE "fastfood_app"."contact_inquiries"
   SET "name" = 'Anonymized Guest',
       "email" = 'anonymized@privacy.invalid',
       "message" = '[ANONYMIZED_AFTER_RETENTION_PERIOD]',
       "resolution_notes" = NULL,
       "source_ip_hash" = NULL,
       "user_agent" = NULL
   WHERE "status" = 'RESOLVED' 
     AND "created_at" < NOW() - INTERVAL '90 days';
   ```

---

## 4. Rollout & Integration Plan

1. **Step 1 (Current State):** Deploy with fail-closed 503 behavior and mailto/phone direct channels on the UI.
2. **Step 2 (Post-Provisioning):** Once initial Supabase roles and migration `0000_white_eddie_brock.sql` are applied and verified in staging:
   - Add `contactInquiries` to `src/lib/db/schema.ts`.
   - Run `npx drizzle-kit generate` to produce `drizzle/0001_add_contact_inquiries.sql`.
   - Apply migration under `MIGRATION_DATABASE_URL` (`fastfood_migrator_role`).
   - Implement `DatabaseContactStorageProvider` in `src/server/domains/contact/contact-service.ts`.
   - Provide an admin support desk view under `/admin/support`.
