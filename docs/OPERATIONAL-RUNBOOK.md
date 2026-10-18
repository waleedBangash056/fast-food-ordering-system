# Operational Runbook & Production Deployment Guide

**Project:** Smash & Sizzle — Premium Fast-Food Restaurant Ordering & Brand Website  
**Version:** 1.0.0  
**Target Schema:** `fastfood_app` (22 application tables, 0 PostgreSQL enum types, 1 Drizzle migration-history table `fastfood_app.__drizzle_migrations`)  
**Protected Schemas (Never Modified):** `public`, `nexora_demo`, `auth`, `storage`

---

## 1. Local Development & Verification

### Prerequisites
- Node.js v20.x or v22.x LTS
- npm v10.x or higher
- Local development mode uses deterministic in-memory seed data when `DATABASE_URL` is unset (`NODE_ENV !== "production"`). Production (`NODE_ENV="production"`) fails closed (`503 CONFIG_ERROR`) if `DATABASE_URL` is missing.

### Local Commands
```bash
# Start development server
npm run dev

# Run Vitest suite (use --no-file-parallelism on memory-constrained Windows hosts)
npx vitest run --no-file-parallelism

# Verify Drizzle migration snapshot/journal consistency
npx drizzle-kit check

# Run TypeScript type check
npx tsc --noEmit

# Build production bundle
npm run build
```

---

## 2. Database Connection & Role Separation Matrix

| Operation | Environment Variable / Interface | Database Role | Effective Privileges |
| :--- | :--- | :--- | :--- |
| **1. Schema & Role Provisioning (Phase 1)** | Supabase SQL Editor (Admin) | `postgres` (Supabase Admin) | Creates `fastfood_app`, creates `fastfood_migrator_role` & `fastfood_runtime_role`, configures `ALTER DEFAULT PRIVILEGES`, and grants temporary database-level `CREATE` to `fastfood_migrator_role`. |
| **2. Schema Migration (`npx drizzle-kit migrate`)** | `MIGRATION_DATABASE_URL` (Required; never falls back to `DATABASE_URL`) | `fastfood_migrator_role` | `USAGE, CREATE` on schema `fastfood_app` + temporary `CREATE` on current database during migration execution window only. Zero access to `nexora_demo` or `public` tables. |
| **3. Post-Migration Lockdown (Phase 2 Step 2.1)** | Supabase SQL Editor (Admin) | `postgres` (Supabase Admin) | Immediately revokes database-level `CREATE` from `fastfood_migrator_role`, grants DML on the 22 application tables to `fastfood_runtime_role`, and revokes `ALL PRIVILEGES` on `fastfood_app.__drizzle_migrations` (and its sequence) from `fastfood_runtime_role` and `PUBLIC`. |
| **4. Database Seeding (`npm run db:seed`)** | `MIGRATION_DATABASE_URL` (Required; dedicated pool in `src/lib/db/seed.ts`) | `fastfood_migrator_role` | Connects via a dedicated `pg.Pool` created from `MIGRATION_DATABASE_URL` (never reuses the runtime `DATABASE_URL` pool) to run idempotent `INSERT ... ON CONFLICT DO NOTHING` statements. |
| **5. Final Isolation Audit (Phase 2 Step 2.2)** | Supabase SQL Editor (Admin) | `postgres` (Supabase Admin) | Executes 6 read-only verification queries confirming effective privileges, role inheritance (`0` memberships), `0` access to `public`/`nexora_demo` tables, `0` runtime access to `__drizzle_migrations`, and DML access on all 22 application tables. |
| **6. Deployed Application Runtime (Render)** | `DATABASE_URL` (Exclusively; never reads `MIGRATION_DATABASE_URL`) | `fastfood_runtime_role` | `USAGE` on `fastfood_app` + `SELECT, INSERT, UPDATE, DELETE` on the 22 application tables (`statement_timeout = '15s'`). Zero DDL (`CREATE` revoked) and zero access to `fastfood_app.__drizzle_migrations`. |

---

## 3. Why Temporary Database-Level `CREATE` Is Required for `drizzle-kit migrate`

1. **Exact Installed Implementation Behavior:**
   - `drizzle-kit` (`v0.31.11`, `node_modules/drizzle-kit/bin.cjs` lines 92053–92061 & 78876–78904) delegates PostgreSQL migrations to `drizzle-orm/node-postgres/migrator` (`node_modules/drizzle-orm/node-postgres/migrator.cjs` lines 25–28), which calls `PgDialect.prototype.migrate` in `node_modules/drizzle-orm/pg-core/dialect.cjs` (`v0.45.3`, lines 46–74).
   - At line 56 of `node_modules/drizzle-orm/pg-core/dialect.cjs`, `PgDialect.prototype.migrate` unconditionally executes:
     ```sql
     CREATE SCHEMA IF NOT EXISTS "fastfood_app"
     ```
     **before** executing `CREATE TABLE IF NOT EXISTS "fastfood_app"."__drizzle_migrations"` and **before** executing any statement in `drizzle/0000_white_eddie_brock.sql`.
2. **PostgreSQL Engine ACL Evaluation Order:**
   - In PostgreSQL (`CreateSchemaCommand`), executing `CREATE SCHEMA IF NOT EXISTS "fastfood_app"` evaluates `ACL_CREATE` on the current **database** (`current_database()`) **before** checking whether the schema `"fastfood_app"` already exists.
   - Consequently:
     - Pre-creating `fastfood_app` in Phase 1 alone does **not** satisfy `PgDialect.prototype.migrate`.
     - Removing `CREATE SCHEMA IF NOT EXISTS "fastfood_app";` from line 1 of `drizzle/0000_white_eddie_brock.sql` alone also does **not** solve the issue because `PgDialect.prototype.migrate` executes `CREATE SCHEMA IF NOT EXISTS "fastfood_app"` internally first.
3. **Comparison of Verified Alternatives:**
   - **Selected Procedure (Controlled Temporary Database-Level `CREATE` Window on `fastfood_migrator_role`):** Grant `CREATE ON DATABASE` to `fastfood_migrator_role` at the end of Phase 1 (Step 1.2.8), immediately run `npx drizzle-kit migrate`, and immediately revoke `CREATE ON DATABASE` from `fastfood_migrator_role` as the very first statement of Phase 2 (Step 2.1.1) — or immediately upon migration failure. This preserves standard `drizzle-kit migrate` journal/hash verification while ensuring neither role retains database-level `CREATE` after migration.
   - **Alternative (Bypassing `drizzle-kit migrate` via Custom SQL Runner or Running Migrations as `postgres` Superuser):** Running migrations as `postgres` violates least-privilege role separation (an accidental unqualified statement could modify `public` or `nexora_demo`), while maintaining a custom SQL runner that skips `PgDialect.prototype.migrate` bypasses Drizzle's built-in migration ledger management.

---

## 4. Step-by-Step Supabase Provisioning, Migration, Lockdown & Seeding Procedure

### Step 1: Pre-Flight & Phase 1 Provisioning (Supabase SQL Editor)
1. Open [docs/SUPABASE-ROLE-ISOLATION.sql](./SUPABASE-ROLE-ISOLATION.sql).
2. Run **Step 1.1** (`information_schema.schemata` and `pg_roles` queries) first and inspect the output. Do **not** assume `fastfood_migrator_role` or `fastfood_runtime_role` are absent until Query 1.1.2 confirms 0 rows.
3. Replace `<REPLACE_WITH_STRONG_MIGRATOR_PASSWORD>` and `<REPLACE_WITH_STRONG_RUNTIME_PASSWORD>` with high-entropy passwords and execute **Step 1.2** (through Step 1.2.8).
4. **Stop at the `STOP HERE BEFORE RUNNING MIGRATIONS!` barrier.**

### Step 2: Execute Controlled Drizzle Migration (Release Workstation CLI)
Run `npx drizzle-kit migrate` using `MIGRATION_DATABASE_URL` (`fastfood_migrator_role`):
```bash
MIGRATION_DATABASE_URL="postgresql://fastfood_migrator_role:<MIGRATOR_PASSWORD>@<SUPABASE_POOLER_HOST>:5432/postgres" npx drizzle-kit migrate
```
- **Emergency Failure Recovery:** If `npx drizzle-kit migrate` fails or aborts for any reason, **immediately** run Step 2.1.1 in the Supabase SQL Editor to revoke the temporary database-level `CREATE` grant before investigating:
  ```sql
  DO $$
  BEGIN
    EXECUTE format('REVOKE CREATE ON DATABASE %I FROM fastfood_migrator_role', current_database());
    EXECUTE format('REVOKE CREATE ON DATABASE %I FROM fastfood_runtime_role', current_database());
  END $$;
  ```

### Step 3: Execute Phase 2 Post-Migration Lockdown (Supabase SQL Editor)
Immediately after `npx drizzle-kit migrate` succeeds, execute **Phase 2 Step 2.1** in [docs/SUPABASE-ROLE-ISOLATION.sql](./SUPABASE-ROLE-ISOLATION.sql):
- Revokes database-level `CREATE` from `fastfood_migrator_role` (and `fastfood_runtime_role`).
- Revokes `ALL` on all tables/sequences/routines in `fastfood_app` from `PUBLIC, anon, authenticated`.
- Grants `SELECT, INSERT, UPDATE, DELETE` on all tables in `fastfood_app` to `fastfood_runtime_role`.
- Revokes `ALL PRIVILEGES` on `fastfood_app.__drizzle_migrations` and `fastfood_app.__drizzle_migrations_id_seq` from `PUBLIC` and `fastfood_runtime_role`.

### Step 4: Execute Controlled Database Seeding (Release Workstation CLI)
Run `npm run db:seed` using `MIGRATION_DATABASE_URL` (`fastfood_migrator_role`):
```bash
MIGRATION_DATABASE_URL="postgresql://fastfood_migrator_role:<MIGRATOR_PASSWORD>@<SUPABASE_POOLER_HOST>:5432/postgres" npm run db:seed
```

### Step 5: Execute Final Effective-Privilege Audit Queries (Supabase SQL Editor)
Run **Phase 2 Step 2.2** (Queries `2.2.0` through `2.2.5`) in [docs/SUPABASE-ROLE-ISOLATION.sql](./SUPABASE-ROLE-ISOLATION.sql) and verify:
- **Query 2.2.0:** `migrator_can_create_db = false` and `runtime_can_create_db = false`.
- **Query 2.2.1:** `0 rows` (no inherited role memberships).
- **Query 2.2.2:** `fastfood_runtime_role` has `can_usage = true, can_create = false` on `fastfood_app`, and `can_usage = false, can_create = false` on `nexora_demo`.
- **Query 2.2.3:** `0 rows` (neither `fastfood_runtime_role` nor `fastfood_migrator_role` can `SELECT`/`INSERT`/`UPDATE`/`DELETE` any table in `public` or `nexora_demo`).
- **Query 2.2.4:** `runtime_can_select = false`, `runtime_can_insert = false`, `runtime_can_update = false`, `runtime_can_delete = false` on `fastfood_app.__drizzle_migrations`.
- **Query 2.2.5:** Exactly **22 rows** returned (all 22 application tables in `fastfood_app`), each with `can_select = true`, `can_insert = true`, `can_update = true`, `can_delete = true`.

---

## 5. Operational Routes & Promo Codes

### Routes
- **Storefront & Menu:** `/menu`, `/menu/[category]`, `/product/[slug]`
- **Cart & Checkout:** `/cart`, `/checkout`
- **Brand Story & 3D Lab:** `/about`
- **Live Guest Order Tracking:** `/orders/[id]/track?token=<trackingToken>`
- **Staff & Admin Portal:** `/admin/login`, `/admin/kitchen`, `/admin/orders`, `/admin/menu`, `/admin/audit`
- **Health Check:** `/api/v1/health`

### Deterministic Promo Codes
- `WELCOME10`: 10% off entire order (min subtotal \$15.00, max discount \$10.00)
- `FRIESFREE`: \$4.99 off any order over \$20.00
- `CHEF20`: 20% off entire order (min subtotal \$25.00, max discount \$15.00)