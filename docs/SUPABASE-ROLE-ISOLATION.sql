-- ============================================================================
-- SMASH & SIZZLE (FAST-FOOD) — SUPABASE TWO-ROLE SCHEMA ISOLATION SCRIPT
-- Target Schema: fastfood_app
-- Protected Schemas (NEVER MODIFIED): public, nexora_demo, auth, storage
-- Current Schema Inventory (from src/lib/db/schema.ts & drizzle/0000_white_eddie_brock.sql):
--   - 22 application tables in `fastfood_app`
--   - 0 PostgreSQL ENUM types (status/role/mode columns are stored as `text`)
--   - 1 Drizzle migration-history table (`fastfood_app.__drizzle_migrations`)
--     created by `npx drizzle-kit migrate` (totaling 23 tables in `fastfood_app`)
-- ============================================================================
-- CONNECTION & STAGE SEPARATION:
--   1. PROVISIONING (Phase 1 below): Run in Supabase SQL Editor as admin (`postgres`).
--   2. MIGRATION EXECUTION: Run from release CLI using `MIGRATION_DATABASE_URL`
--      (`fastfood_migrator_role`) via `npx drizzle-kit migrate`.
--   3. POST-MIGRATION LOCKDOWN (Phase 2 Step 2.1 below): Run IMMEDIATELY after
--      `npx drizzle-kit migrate` (even if migration fails) in Supabase SQL Editor
--      as admin (`postgres`) to revoke the temporary database-level `CREATE` grant
--      and lock down `fastfood_app.__drizzle_migrations`.
--   4. SEEDING: Run from release CLI using `MIGRATION_DATABASE_URL`
--      (`fastfood_migrator_role`) via `npm run db:seed`.
--   5. FINAL VERIFICATION (Phase 2 Step 2.2 below): Run in Supabase SQL Editor
--      and verify all 6 effective-privilege audit queries before deployment.
--   6. APPLICATION RUNTIME: Deployed Render service connects ONLY via `DATABASE_URL`
--      (`fastfood_runtime_role` — strictly DML-only on the 22 application tables).
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-MIGRATION PROVISIONING (RUN BEFORE `npx drizzle-kit migrate`)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1.1: READ-ONLY PRE-FLIGHT VERIFICATION (Run first and inspect output)
-- Do NOT assume `fastfood_migrator_role` or `fastfood_runtime_role` are absent
-- until Query 1.1.2 below has been executed and inspected.
-- ----------------------------------------------------------------------------
-- 1.1.1 Check existing schemas
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN ('fastfood_app', 'public', 'nexora_demo')
ORDER BY schema_name;

-- 1.1.2 Check whether proposed roles already exist
SELECT rolname, rolinherit, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
FROM pg_roles
WHERE rolname IN ('fastfood_migrator_role', 'fastfood_runtime_role');

-- ----------------------------------------------------------------------------
-- STEP 1.2: CREATE DEDICATED SCHEMA & SEPARATE MIGRATOR / RUNTIME ROLES
-- ----------------------------------------------------------------------------
-- 1.2.1 Create the dedicated schema (owned by postgres / admin)
CREATE SCHEMA IF NOT EXISTS fastfood_app;

-- 1.2.2 Create the Controlled Migration Role (DDL + DML inside fastfood_app ONLY)
-- Used ONLY by `npx drizzle-kit migrate` and `npm run db:seed` via MIGRATION_DATABASE_URL.
CREATE ROLE fastfood_migrator_role WITH
  LOGIN
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD '<REPLACE_WITH_STRONG_MIGRATOR_PASSWORD>';

-- 1.2.3 Create the Least-Privilege Application Runtime Role (DML ONLY, ZERO DDL)
-- Used exclusively by the deployed Render Web Service via DATABASE_URL.
-- Cannot create schemas, cannot create/alter/drop tables, cannot run migrations.
CREATE ROLE fastfood_runtime_role WITH
  LOGIN
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD '<REPLACE_WITH_STRONG_RUNTIME_PASSWORD>';

-- 1.2.4 Lock default search_path and statement_timeout for both roles
ALTER ROLE fastfood_migrator_role SET search_path = fastfood_app;
ALTER ROLE fastfood_runtime_role SET search_path = fastfood_app;
ALTER ROLE fastfood_runtime_role SET statement_timeout = '15s';

-- 1.2.5 Revoke PUBLIC and Supabase PostgREST role access on fastfood_app ONLY
-- (Never modify global PUBLIC grants on `public` or `nexora_demo` so existing apps are unaffected)
REVOKE ALL ON SCHEMA fastfood_app FROM PUBLIC;
REVOKE ALL ON SCHEMA fastfood_app FROM anon, authenticated;

-- 1.2.6 Grant schema-level privileges on fastfood_app ONLY
-- Migrator gets USAGE + CREATE on fastfood_app (to create/alter tables during migrations)
GRANT USAGE, CREATE ON SCHEMA fastfood_app TO fastfood_migrator_role;

-- Runtime gets USAGE ONLY (strictly no CREATE privilege on fastfood_app)
GRANT USAGE ON SCHEMA fastfood_app TO fastfood_runtime_role;
REVOKE CREATE ON SCHEMA fastfood_app FROM fastfood_runtime_role;

-- 1.2.7 Configure default privileges so tables/sequences created by fastfood_migrator_role
-- in fastfood_app automatically grant strictly DML to fastfood_runtime_role and ZERO to PUBLIC:
ALTER DEFAULT PRIVILEGES FOR ROLE fastfood_migrator_role IN SCHEMA fastfood_app
  REVOKE ALL ON TABLES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE fastfood_migrator_role IN SCHEMA fastfood_app
  REVOKE ALL ON SEQUENCES FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE fastfood_migrator_role IN SCHEMA fastfood_app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fastfood_runtime_role;

ALTER DEFAULT PRIVILEGES FOR ROLE fastfood_migrator_role IN SCHEMA fastfood_app
  GRANT USAGE, SELECT ON SEQUENCES TO fastfood_runtime_role;

-- 1.2.8 Temporary Database-Level CREATE Grant for `fastfood_migrator_role` ONLY
-- WHY THIS IS REQUIRED:
--   `drizzle-kit migrate` (v0.31.11) delegates to `PgDialect.prototype.migrate` in
--   `drizzle-orm/pg-core/dialect.cjs` (v0.45.3, line 56), which unconditionally executes:
--     CREATE SCHEMA IF NOT EXISTS "fastfood_app"
--   before creating `"fastfood_app"."__drizzle_migrations"` and before running
--   `drizzle/0000_white_eddie_brock.sql`. In PostgreSQL (`CreateSchemaCommand`),
--   `CREATE SCHEMA IF NOT EXISTS` checks database-level `CREATE` (`ACL_CREATE` on
--   `current_database()`) BEFORE checking whether `fastfood_app` already exists.
--   Pre-creating `fastfood_app` or editing `0000_white_eddie_brock.sql` does not bypass
--   Drizzle ORM's internal migrator check.
--   Therefore, we grant `CREATE` on the current database to `fastfood_migrator_role`
--   immediately before running `npx drizzle-kit migrate` and REVOKE it immediately in
--   Phase 2 Step 2.1.1 (or immediately upon migration failure).
--   `fastfood_runtime_role` NEVER receives database-level `CREATE`.
DO $$
BEGIN
  EXECUTE format('GRANT CREATE ON DATABASE %I TO fastfood_migrator_role', current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM fastfood_runtime_role', current_database());
END $$;

-- ============================================================================
-- STOP HERE BEFORE RUNNING MIGRATIONS!
--
-- 1. From your controlled release workstation, run:
--      MIGRATION_DATABASE_URL="postgresql://fastfood_migrator_role:..." npx drizzle-kit migrate
--
-- 2. EMERGENCY FAILURE RECOVERY (IF `npx drizzle-kit migrate` FAILS OR ABORTS):
--    Immediately execute Step 2.1.1 below in the Supabase SQL Editor to revoke
--    the temporary database-level `CREATE` privilege from `fastfood_migrator_role`
--    before investigating the failure. Do NOT leave database-level `CREATE` granted.
--
-- 3. Once `npx drizzle-kit migrate` succeeds, immediately run PHASE 2 below.
-- ============================================================================


-- ============================================================================
-- PHASE 2: POST-MIGRATION LOCKDOWN & EFFECTIVE-PRIVILEGE AUDIT
-- (RUN IMMEDIATELY AFTER `npx drizzle-kit migrate`)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 2.1: IMMEDIATE REVOCATION OF TEMPORARY DATABASE CREATE & TABLE LOCKDOWN
-- ----------------------------------------------------------------------------
-- 2.1.1 Immediately revoke temporary database-level CREATE from fastfood_migrator_role
-- (Run this step EVEN IF `npx drizzle-kit migrate` failed!)
DO $$
BEGIN
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM fastfood_migrator_role', current_database());
  EXECUTE format('REVOKE CREATE ON DATABASE %I FROM fastfood_runtime_role', current_database());
END $$;

-- 2.1.2 Remove any default PUBLIC privileges on newly created objects in fastfood_app
REVOKE ALL ON ALL TABLES IN SCHEMA fastfood_app FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fastfood_app FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA fastfood_app FROM PUBLIC, anon, authenticated;

-- 2.1.3 Grant explicit DML on application tables/sequences to fastfood_runtime_role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fastfood_app TO fastfood_runtime_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fastfood_app TO fastfood_runtime_role;

-- 2.1.4 Explicitly revoke ALL privileges (including SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER)
-- on the Drizzle migration ledger table and its sequence from fastfood_runtime_role.
-- The runtime application never queries `__drizzle_migrations`.
REVOKE ALL PRIVILEGES ON TABLE fastfood_app.__drizzle_migrations FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE fastfood_app.__drizzle_migrations FROM fastfood_runtime_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'fastfood_app'
      AND c.relname = '__drizzle_migrations_id_seq'
      AND c.relkind = 'S'
  ) THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON SEQUENCE fastfood_app.__drizzle_migrations_id_seq FROM PUBLIC';
    EXECUTE 'REVOKE ALL PRIVILEGES ON SEQUENCE fastfood_app.__drizzle_migrations_id_seq FROM fastfood_runtime_role';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- STEP 2.2: COMPLETE EFFECTIVE PRIVILEGE, PUBLIC GRANT & INHERITANCE AUDIT
-- (Do NOT assert complete schema isolation until all 6 queries below are verified)
-- ----------------------------------------------------------------------------

-- 2.2.0 Verify temporary database-level CREATE privilege has been revoked from both roles
-- (Expected: migrator_can_create_db = false, runtime_can_create_db = false)
SELECT
  has_database_privilege('fastfood_migrator_role', current_database(), 'CREATE') AS migrator_can_create_db,
  has_database_privilege('fastfood_runtime_role', current_database(), 'CREATE') AS runtime_can_create_db;

-- 2.2.1 Verify recursive role memberships (Expected: 0 rows for both roles)
WITH RECURSIVE role_membership AS (
  SELECT
    r.oid AS member_oid,
    r.rolname AS role_name,
    m.oid AS parent_oid,
    m.rolname AS granted_role,
    am.inherit_option,
    1 AS depth
  FROM pg_auth_members am
  JOIN pg_roles r ON r.oid = am.member
  JOIN pg_roles m ON m.oid = am.roleid
  WHERE r.rolname IN ('fastfood_migrator_role', 'fastfood_runtime_role')
  UNION ALL
  SELECT
    rm.member_oid,
    rm.role_name,
    m.oid AS parent_oid,
    m.rolname AS granted_role,
    am.inherit_option,
    rm.depth + 1
  FROM role_membership rm
  JOIN pg_auth_members am ON am.member = rm.parent_oid
  JOIN pg_roles m ON m.oid = am.roleid
  WHERE rm.depth < 10
)
SELECT role_name, granted_role, inherit_option, depth
FROM role_membership;

-- 2.2.2 Verify effective schema privileges (including PUBLIC inheritance) across all relevant schemas
SELECT
  r.rolname,
  s.nspname AS schema_name,
  has_schema_privilege(r.rolname, s.nspname, 'USAGE') AS can_usage,
  has_schema_privilege(r.rolname, s.nspname, 'CREATE') AS can_create
FROM pg_roles r
CROSS JOIN pg_namespace s
WHERE r.rolname IN ('fastfood_migrator_role', 'fastfood_runtime_role', 'anon', 'authenticated')
  AND s.nspname IN ('fastfood_app', 'public', 'nexora_demo', 'auth', 'storage')
ORDER BY r.rolname, s.nspname;

-- Expected verification criteria:
--   fastfood_runtime_role  on fastfood_app : can_usage = true,  can_create = false (No DDL!)
--   fastfood_migrator_role on fastfood_app : can_usage = true,  can_create = true
--   fastfood_runtime_role  on nexora_demo  : can_usage = false, can_create = false
--   fastfood_migrator_role on nexora_demo  : can_usage = false, can_create = false
--   anon / authenticated   on fastfood_app : can_usage = false, can_create = false
--   NOTE ON `public`: PostgreSQL grants USAGE on `public` to PUBLIC by default.
--   Never revoke PUBLIC on `public` globally so existing applications in `public` are not disrupted.
--   Instead, verify in Query 2.2.3 below that 0 tables/views in `public` or `nexora_demo`
--   are readable or writable by `fastfood_runtime_role` or `fastfood_migrator_role`.

-- 2.2.3 Verify effective table-level privileges inside `public` and `nexora_demo`
-- (Expected: 0 rows. If any rows are returned due to legacy PUBLIC table grants in `public`,
--  do NOT proceed until those specific legacy table PUBLIC grants are reviewed.)
SELECT
  r.rolname,
  t.table_schema,
  t.table_name,
  has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'SELECT') AS can_select,
  has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'INSERT') AS can_insert,
  has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'UPDATE') AS can_update,
  has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'DELETE') AS can_delete
FROM pg_roles r
CROSS JOIN information_schema.tables t
WHERE r.rolname IN ('fastfood_migrator_role', 'fastfood_runtime_role')
  AND t.table_schema IN ('public', 'nexora_demo')
  AND (
    has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'SELECT')
    OR has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'INSERT')
    OR has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'UPDATE')
    OR has_table_privilege(r.rolname, quote_ident(t.table_schema) || '.' || quote_ident(t.table_name), 'DELETE')
  );

-- 2.2.4 Verify `fastfood_runtime_role` has ZERO access to `fastfood_app.__drizzle_migrations`
-- (Expected: runtime_can_select = false, runtime_can_insert = false, runtime_can_update = false, runtime_can_delete = false)
SELECT
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.__drizzle_migrations', 'SELECT') AS runtime_can_select,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.__drizzle_migrations', 'INSERT') AS runtime_can_insert,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.__drizzle_migrations', 'UPDATE') AS runtime_can_update,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.__drizzle_migrations', 'DELETE') AS runtime_can_delete;

-- 2.2.5 Verify `fastfood_runtime_role` has DML access to all 22 application tables in `fastfood_app`
-- (Expected: 22 rows returned, each with can_select = true, can_insert = true, can_update = true, can_delete = true)
SELECT
  table_name,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.' || quote_ident(table_name), 'SELECT') AS can_select,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.' || quote_ident(table_name), 'INSERT') AS can_insert,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.' || quote_ident(table_name), 'UPDATE') AS can_update,
  has_table_privilege('fastfood_runtime_role', 'fastfood_app.' || quote_ident(table_name), 'DELETE') AS can_delete
FROM information_schema.tables
WHERE table_schema = 'fastfood_app'
  AND table_name <> '__drizzle_migrations'
ORDER BY table_name;


