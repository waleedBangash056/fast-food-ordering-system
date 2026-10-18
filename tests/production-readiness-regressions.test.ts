import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  authenticateStaffCredentials,
  decodeStaffSession,
  encodeStaffSession,
  hashPasswordScrypt,
  isDemoAuthEnabled,
  type StaffSession,
} from "../src/lib/auth/session";
import drizzleConfig, { resolveMigrationDatabaseUrl } from "../drizzle.config";
import {
  assertDatabaseReadyForRuntime,
  db,
  FASTFOOD_SCHEMA,
  isDatabaseConfigured,
  pool as runtimePool,
  resolveRuntimeDatabaseUrl,
} from "../src/lib/db";
import {
  createSeedDatabaseConnection,
  resolveSeedDatabaseUrl,
  runSeed,
} from "../src/lib/db/seed";
import { catalogService } from "../src/server/domains/catalog/catalog-service";
import { orderService } from "../src/server/domains/ordering/order-service";
import {
  paymentService,
  computeWebhookSignature,
  isMockPaymentAllowed,
  resetInMemoryPaymentStores,
} from "../src/server/domains/payments/payment-provider";
import { advanceBurgerRotationAngle } from "../src/components/about/burger-canvas";
import { GET as getOrdersRoute, POST as postOrdersRoute } from "../src/app/api/v1/orders/route";
import { GET as getOrderByIdRoute } from "../src/app/api/v1/orders/[id]/route";
import { GET as getOrderEventsRoute } from "../src/app/api/v1/orders/[id]/events/route";
import { GET as getAdminMenuRoute } from "../src/app/api/v1/admin/menu/route";
import { POST as postCartValidateRoute } from "../src/app/api/v1/cart/validate/route";
import { GET as getHealthRoute } from "../src/app/api/v1/health/route";
import { GET as getContactRoute, POST as postContactRoute } from "../src/app/api/v1/contact/route";
import {
  contactService,
  InMemoryContactStorageProvider,
} from "../src/server/domains/contact/contact-service";

describe("Production Readiness & Security Regressions", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("1. enforces strict schema isolation, pre/post migration sequencing, and full __drizzle_migrations revocation", () => {
    expect(FASTFOOD_SCHEMA).toBe("fastfood_app");

    const migrationPath = path.resolve(
      process.cwd(),
      "drizzle/0000_white_eddie_brock.sql"
    );
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, "utf8");
    expect(sql.startsWith('CREATE SCHEMA IF NOT EXISTS "fastfood_app";')).toBe(true);

    const createTableMatches = sql.match(/CREATE TABLE "fastfood_app"\."[^"]+"/g) || [];
    expect(createTableMatches.length).toBe(22);

    // Must never reference public or nexora_demo schemas
    expect(sql.toLowerCase()).not.toContain('"public"');
    expect(sql.toLowerCase()).not.toContain("nexora_demo");

    const roleScriptPath = path.resolve(
      process.cwd(),
      "docs/SUPABASE-ROLE-ISOLATION.sql"
    );
    expect(fs.existsSync(roleScriptPath)).toBe(true);
    const roleSql = fs.readFileSync(roleScriptPath, "utf8");
    expect(roleSql).toContain("PHASE 1: PRE-MIGRATION PROVISIONING");
    expect(roleSql).toContain("PHASE 2: POST-MIGRATION LOCKDOWN");
    expect(roleSql).toContain("fastfood_migrator_role");
    expect(roleSql).toContain("fastfood_runtime_role");
    expect(roleSql).toContain("NOINHERIT");
    expect(roleSql).toContain(
      "REVOKE ALL PRIVILEGES ON TABLE fastfood_app.__drizzle_migrations FROM fastfood_runtime_role;"
    );

    // Verify Phase 1 executable SQL (before the STOP marker) does NOT reference __drizzle_migrations
    const [phase1Sql, phase2Sql] = roleSql.split("STOP HERE BEFORE RUNNING MIGRATIONS!");
    expect(phase1Sql).toBeDefined();
    expect(phase2Sql).toBeDefined();
    const phase1ExecutableSql = phase1Sql.replace(/--.*$/gm, "");
    expect(phase1ExecutableSql).not.toContain("__drizzle_migrations");
    expect(phase1ExecutableSql).toContain(
      "GRANT CREATE ON DATABASE %I TO fastfood_migrator_role"
    );
    expect(phase2Sql).toContain(
      "REVOKE CREATE ON DATABASE %I FROM fastfood_migrator_role"
    );
    expect(phase2Sql).toContain("has_database_privilege('fastfood_migrator_role'");
    expect(phase2Sql).toContain("fastfood_app.__drizzle_migrations");
    expect(phase2Sql).toContain("WITH RECURSIVE role_membership");

    // Must not contain stale references to 13 tables or 9 enums
    expect(roleSql).not.toContain("13 application tables");
    expect(roleSql).toContain("22 application tables");
    expect(roleSql).toContain("0 PostgreSQL ENUM types");
  });

  it("2. rejects unsigned base64url cookies and tampered HMAC payloads", () => {
    const validSession: StaffSession = {
      userId: "usr-staff-1",
      fullName: "Dave Wilson",
      email: "staff@smashsizzle.com",
      role: "STAFF",
      branchId: "branch-1",
      branchName: "Downtown Flagship",
      expiresAt: Date.now() + 60_000,
    };

    // Legacy unsigned base64url JSON cookie must be rejected
    const forgedUnsignedToken = Buffer.from(
      JSON.stringify({ ...validSession, role: "ADMIN" })
    ).toString("base64url");
    expect(decodeStaffSession(forgedUnsignedToken)).toBeNull();

    // Properly signed token decodes cleanly
    const signedToken = encodeStaffSession(validSession);
    expect(signedToken.split(".").length).toBe(2);
    const decoded = decodeStaffSession(signedToken);
    expect(decoded?.role).toBe("STAFF");

    // Tampering with the payload (escalating STAFF -> ADMIN) while keeping signature must fail
    const [, signaturePart] = signedToken.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...validSession, role: "ADMIN" })
    ).toString("base64url");
    const tamperedToken = `${tamperedPayload}.${signaturePart}`;
    expect(decodeStaffSession(tamperedToken)).toBeNull();
  });

  it("3. requires SESSION_SECRET (>=32 chars), blocks demo login even if ALLOW_DEMO_STAFF_LOGIN=true in production, and supports scrypt hashes", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ALLOW_DEMO_STAFF_LOGIN = "true"; // Must be ignored in production!
    expect(isDemoAuthEnabled()).toBe(false);

    delete process.env.SESSION_SECRET;

    const sampleSession: StaffSession = {
      userId: "usr-admin-1",
      fullName: "Alex Morgan",
      email: "admin@smashsizzle.com",
      role: "ADMIN",
      branchId: "all",
      branchName: "All Flagship Branches",
      expiresAt: Date.now() + 60_000,
    };

    // Missing SESSION_SECRET in production must fail closed
    expect(() => encodeStaffSession(sampleSession)).toThrow();

    process.env.SESSION_SECRET =
      "prod_test_secret_key_with_at_least_32_characters_999";

    // Demo PIN "9999" and demo password "admin123" must fail in production
    await expect(
      authenticateStaffCredentials("admin@smashsizzle.com", "9999")
    ).rejects.toThrow();
    await expect(
      authenticateStaffCredentials("admin@smashsizzle.com", "admin123")
    ).rejects.toThrow();

    // Provisioned scrypt password hash via env var succeeds
    process.env.ADMIN_PASSWORD = hashPasswordScrypt("TestOnly#ScryptPassword2026!Valid");
    const prodSession = await authenticateStaffCredentials(
      "admin@smashsizzle.com",
      "TestOnly#ScryptPassword2026!Valid"
    );
    expect(prodSession.role).toBe("ADMIN");

    // Verify kitchen alias env var support (KITCHEN_PASSWORD & KITCHEN_OPERATOR_PASSWORD)
    process.env.KITCHEN_PASSWORD = "TestOnly#KitchenPassword2026!Valid";
    const chefSession = await authenticateStaffCredentials(
      "chef@smashsizzle.com",
      "TestOnly#KitchenPassword2026!Valid"
    );
    expect(chefSession.role).toBe("KITCHEN_OPERATOR");
  });

  it("4. blocks unauthenticated GET /api/v1/orders, GET /api/v1/admin/menu, and redacts internal fields for guest order tracking", async () => {
    // 4a. Unauthenticated GET /api/v1/orders -> 401
    const unauthListReq = new NextRequest("http://localhost:3000/api/v1/orders");
    const unauthListRes = await getOrdersRoute(unauthListReq);
    expect(unauthListRes.status).toBe(401);

    // 4b. Unauthenticated GET /api/v1/admin/menu -> 401
    const unauthMenuReq = new Request("http://localhost:3000/api/v1/admin/menu");
    const unauthMenuRes = await getAdminMenuRoute(unauthMenuReq);
    expect(unauthMenuRes.status).toBe(401);

    // 4c. Authenticated STAFF GET /api/v1/orders -> 200
    const staffToken = encodeStaffSession({
      userId: "usr-staff-1",
      fullName: "Dave Wilson",
      email: "staff@smashsizzle.com",
      role: "STAFF",
      branchId: "branch-1",
      branchName: "Downtown Flagship",
      expiresAt: Date.now() + 60_000,
    });
    const authListReq = new NextRequest("http://localhost:3000/api/v1/orders", {
      headers: { cookie: `ss_staff_session=${staffToken}` },
    });
    const authListRes = await getOrdersRoute(authListReq);
    expect(authListRes.status).toBe(200);

    // 4d. Missing trackingToken on GET /api/v1/orders/ord-test-101 without staff cookie -> 401
    const noTokenReq = new NextRequest(
      "http://localhost:3000/api/v1/orders/ord-test-101"
    );
    const noTokenRes = await getOrderByIdRoute(noTokenReq, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });
    expect(noTokenRes.status).toBe(401);

    // 4e. Wrong trackingToken -> 403
    const wrongTokenReq = new NextRequest(
      "http://localhost:3000/api/v1/orders/ord-test-101?token=wrong_token_123"
    );
    const wrongTokenRes = await getOrderByIdRoute(wrongTokenReq, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });
    expect(wrongTokenRes.status).toBe(403);

    // 4f. Valid trackingToken -> 200 and redacts trackingToken + idempotencyKey from response body
    const validTokenReq = new NextRequest(
      "http://localhost:3000/api/v1/orders/ord-test-101?token=token_sample_guest_abc123xyz789"
    );
    const validTokenRes = await getOrderByIdRoute(validTokenReq, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });
    expect(validTokenRes.status).toBe(200);
    const validTokenJson = await validTokenRes.json();
    expect(validTokenJson.data.trackingToken).toBeUndefined();
    expect(validTokenJson.data.idempotencyKey).toBeUndefined();

    // 4g. Missing trackingToken on SSE /api/v1/orders/ord-test-101/events -> 401
    const sseNoTokenReq = new NextRequest(
      "http://localhost:3000/api/v1/orders/ord-test-101/events"
    );
    const sseNoTokenRes = await getOrderEventsRoute(sseNoTokenReq, {
      params: Promise.resolve({ id: "ord-test-101" }),
    });
    expect(sseNoTokenRes.status).toBe(401);
  });

  it("5. enforces payment fail-closed in production (even if PAYMENT_MODE=MOCK) and requires exact amount & currency match on webhooks", async () => {
    const order = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Security Tester",
        email: "sec@example.com",
        phone: "555-0199",
      },
      items: [
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    // 5a. In NODE_ENV=production, PAYMENT_MODE=MOCK must STILL be rejected (never allowed in prod)
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.PAYMENT_MODE = "MOCK";
    expect(isMockPaymentAllowed()).toBe(false);

    await expect(
      paymentService.createPaymentIntent(order.id, "MOCK")
    ).rejects.toThrow(/forbidden in production/i);

    await expect(
      paymentService.createPaymentIntent(order.id, "STRIPE", {
        trackingToken: order.trackingToken,
        simulateCaptureInSandbox: true,
      })
    ).rejects.toThrow(/forbidden in production/i);

    // Unsupported live payment intent creation in production must fail closed until real SDK is integrated
    await expect(
      paymentService.createPaymentIntent(order.id, "STRIPE")
    ).rejects.toThrow(/fail closed/i);

    // 5b. Test live HMAC webhook verification + exact amount and currency checks
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.PAYMENT_MODE = "LIVE";
    process.env.PAYMENT_WEBHOOK_SECRET = "whsec_production_hmac_secret_key_2026";

    const baseWebhookPayload = {
      eventId: `evt_prod_${Date.now()}`,
      provider: "STRIPE",
      eventType: "payment.succeeded" as const,
      orderId: order.id,
      amountMinor: order.totalMinor,
      currency: "USD",
    };
    const rawBody = JSON.stringify(baseWebhookPayload);

    // Unsigned webhook must be rejected
    await expect(
      paymentService.processWebhook("STRIPE", null, baseWebhookPayload, rawBody)
    ).rejects.toThrow(/Missing cryptographic webhook signature/i);

    // Dev test signature ("sig_valid_test") must be rejected in LIVE mode
    await expect(
      paymentService.processWebhook(
        "STRIPE",
        "sig_valid_test",
        baseWebhookPayload,
        rawBody
      )
    ).rejects.toThrow(/Invalid webhook HMAC signature/i);

    // Overpayment / mismatched amount (order.totalMinor + 100) must be rejected (exact match required)
    const overpaidPayload = {
      ...baseWebhookPayload,
      eventId: `evt_overpaid_${Date.now()}`,
      amountMinor: order.totalMinor + 100,
    };
    const overpaidRaw = JSON.stringify(overpaidPayload);
    const overpaidHmac = computeWebhookSignature(
      overpaidRaw,
      process.env.PAYMENT_WEBHOOK_SECRET
    );
    await expect(
      paymentService.processWebhook(
        "STRIPE",
        `sha256=${overpaidHmac}`,
        overpaidPayload,
        overpaidRaw
      )
    ).rejects.toThrow(/does not exactly match order total/i);

    // Wrong currency ("EUR") must be rejected
    const wrongCurrencyPayload = {
      ...baseWebhookPayload,
      eventId: `evt_eur_${Date.now()}`,
      currency: "EUR",
    };
    const wrongCurrencyRaw = JSON.stringify(wrongCurrencyPayload);
    const wrongCurrencyHmac = computeWebhookSignature(
      wrongCurrencyRaw,
      process.env.PAYMENT_WEBHOOK_SECRET
    );
    await expect(
      paymentService.processWebhook(
        "STRIPE",
        `sha256=${wrongCurrencyHmac}`,
        wrongCurrencyPayload,
        wrongCurrencyRaw
      )
    ).rejects.toThrow(/currency \(EUR\) does not match/i);

    // Order must still be PENDING_PAYMENT
    const stillPending = await orderService.getOrderById(order.id);
    expect(stillPending?.status).toBe("PENDING_PAYMENT");

    // Genuine Stripe-style timestamped HMAC signature (t=<ts>,v1=<hmac>) with exact amount & USD succeeds
    const timestampSec = Math.floor(Date.now() / 1000);
    const stripeSignedPayload = `${timestampSec}.${rawBody}`;
    const validStripeHmac = computeWebhookSignature(
      stripeSignedPayload,
      process.env.PAYMENT_WEBHOOK_SECRET
    );
    const verifiedResult = await paymentService.processWebhook(
      "STRIPE",
      `t=${timestampSec},v1=${validStripeHmac}`,
      baseWebhookPayload,
      rawBody
    );
    expect(verifiedResult.processed).toBe(true);

    const confirmedOrder = await orderService.getOrderById(order.id);
    expect(confirmedOrder?.status).toBe("CONFIRMED");
  });

  it("6. fails closed in production when DATABASE_URL is missing instead of falling back to memory", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    expect(() => assertDatabaseReadyForRuntime()).toThrow(
      /Production runtime requires DATABASE_URL/i
    );
    await expect(orderService.getAllOrders()).rejects.toThrow(
      /Production runtime requires DATABASE_URL/i
    );
  });

  it("7. rejects client-side price tampering on order creation and cart validation", async () => {
    // Attempt to buy a $15.99 burger (item-1) for $1.00 (100 cents)
    await expect(
      orderService.createOrder({
        serviceMode: "PICKUP",
        branchId: "branch-1",
        customer: {
          fullName: "Price Tamperer",
          email: "tamper@example.com",
          phone: "555-0000",
        },
        items: [
          {
            menuItemId: "item-1",
            name: "The Truffle Umami Smashed Burger",
            basePriceMinor: 100, // Tampered! Catalog is 1599
            quantity: 1,
            selectedModifiers: {},
          },
        ],
      })
    ).rejects.toThrow(/Price mismatch/i);

    const cartReq = new NextRequest("http://localhost:3000/api/v1/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceMode: "PICKUP",
        items: [
          {
            menuItemId: "item-1",
            name: "The Truffle Umami Smashed Burger",
            basePriceMinor: 100, // Tampered!
            quantity: 1,
            selectedModifiers: {},
          },
        ],
      }),
    });
    const cartRes = await postCartValidateRoute(cartReq);
    expect(cartRes.status).toBe(400);
    const cartJson = await cartRes.json();
    expect(cartJson.error.code).toBe("VALIDATION_ERROR");
  });

  it("8. exposes /api/v1/health with targetSchema fastfood_app and no leaked secrets", async () => {
    delete process.env.DATABASE_URL;
    const res = await getHealthRoute();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json.targetSchema).toBe("fastfood_app");
    expect(json.database).toBeDefined();
    expect(json.database.configured).toBe(false);
    expect(json.database.persistenceMode).toBe("in-memory-fallback");
  });

  it("9. enforces strict separation between MIGRATION_DATABASE_URL (migrations & seed) and DATABASE_URL (runtime)", async () => {
    // 1. When only DATABASE_URL is set, drizzle.config.ts and seed.ts MUST fail immediately and never fall back to DATABASE_URL
    process.env.DATABASE_URL =
      "postgresql://fastfood_runtime_role:runtime_pass@localhost:5432/fast_food";
    delete process.env.MIGRATION_DATABASE_URL;

    expect(() => resolveMigrationDatabaseUrl(process.env)).toThrow(
      /MIGRATION_DATABASE_URL is required.*Refusing to fall back to runtime DATABASE_URL/i
    );
    expect(() => (drizzleConfig as any).dbCredentials.url).toThrow(
      /MIGRATION_DATABASE_URL is required.*Refusing to fall back to runtime DATABASE_URL/i
    );
    expect(() => resolveSeedDatabaseUrl(process.env)).toThrow(
      /MIGRATION_DATABASE_URL is required.*Refusing to fall back to runtime DATABASE_URL/i
    );
    await expect(runSeed(process.env)).rejects.toThrow(
      /MIGRATION_DATABASE_URL is required.*Refusing to fall back to runtime DATABASE_URL/i
    );

    // 2. When only MIGRATION_DATABASE_URL is set, runtime DB MUST NOT fall back to MIGRATION_DATABASE_URL
    delete process.env.DATABASE_URL;
    process.env.MIGRATION_DATABASE_URL =
      "postgresql://fastfood_migrator_role:migrator_pass@localhost:5432/fast_food";

    expect(resolveRuntimeDatabaseUrl(process.env)).toBeNull();
    expect(isDatabaseConfigured(process.env)).toBe(false);
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    expect(() => assertDatabaseReadyForRuntime(process.env)).toThrow(
      /Production runtime requires DATABASE_URL/i
    );

    // 3. Dedicated seed connection constructs its own Pool bound to MIGRATION_DATABASE_URL (never reusing runtimePool)
    expect((drizzleConfig as any).dbCredentials.url).toBe(
      "postgresql://fastfood_migrator_role:migrator_pass@localhost:5432/fast_food"
    );
    const seedConn = createSeedDatabaseConnection(process.env);
    try {
      expect(seedConn.connectionString).toBe(process.env.MIGRATION_DATABASE_URL);
      expect(seedConn.pool).not.toBe(runtimePool);
      expect((seedConn.pool as any).options.connectionString).toBe(
        process.env.MIGRATION_DATABASE_URL
      );
    } finally {
      await seedConn.pool.end();
    }
  });

  it("10. enforces authoritative modifier validation (forged IDs, wrong-group options, unknown groups, inactive options, min/max/required selection rules, and direct order API bypass prevention)", async () => {
    // 10a. Valid modifier combination resolves authoritative catalog option names and prices
    const validResolved = await catalogService.resolveAuthoritativeOrderItems([
      {
        menuItemId: "item-1",
        name: "Client Spoofed Item Name",
        basePriceMinor: 1599,
        quantity: 2,
        selectedModifiers: {
          "Patty Selection": [
            { id: "opt-double", name: "Client Spoofed Patty Label", priceDeltaMinor: 350 },
          ],
          "Cheese Choice": [
            { id: "opt-gouda", name: "Client Spoofed Cheese Label", priceDeltaMinor: 100 },
          ],
          "Premium Add-ons": [
            { id: "opt-bacon", name: "Bacon", priceDeltaMinor: 200 },
            { id: "opt-jalapeno", name: "Jalapeno", priceDeltaMinor: 75 },
          ],
        },
      },
    ]);

    expect(validResolved[0].name).toBe("The Truffle Umami Smashed Burger");
    expect(validResolved[0].selectedModifiers["Patty Selection"][0].name).toBe(
      "Double Patty (1/2 lb)"
    );
    expect(validResolved[0].selectedModifiers["Cheese Choice"][0].name).toBe(
      "Dutch Smoked Gouda"
    );
    expect(validResolved[0].selectedModifiers["Premium Add-ons"].length).toBe(2);

    // 10b. Forged option ID must be rejected
    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-forged-free-wagyu", name: "Free Wagyu", priceDeltaMinor: 0 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ])
    ).rejects.toThrow(/Unknown or forged modifier option 'opt-forged-free-wagyu'/i);

    // 10c. Wrong-group option ID (submitting an add-on option ID under 'Patty Selection') must be rejected
    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-bacon", name: "Applewood Smoked Bacon", priceDeltaMinor: 200 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ])
    ).rejects.toThrow(/belongs to group 'Premium Add-ons', not 'Patty Selection'/i);

    // 10d. Unknown modifier group must be rejected
    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
            "Secret Unlisted Group": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
            ],
          },
        },
      ])
    ).rejects.toThrow(/Unknown modifier group 'Secret Unlisted Group'/i);

    // 10e. Missing required selections & too few selections (minSelections violation) must be rejected
    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
            ],
            // Missing required "Cheese Choice"
          },
        },
      ])
    ).rejects.toThrow(/Modifier group 'Cheese Choice'.*requires at least 1 selection/i);

    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ])
    ).rejects.toThrow(/Modifier group 'Patty Selection'.*requires at least 1 selection/i);

    // 10f. Too many selections (SINGLE group with 2 options, or duplicate options) must be rejected
    await expect(
      catalogService.resolveAuthoritativeOrderItems([
        {
          menuItemId: "item-1",
          name: "The Truffle Umami Smashed Burger",
          basePriceMinor: 1599,
          quantity: 1,
          selectedModifiers: {
            "Patty Selection": [
              { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
              { id: "opt-double", name: "Double Patty (1/2 lb)", priceDeltaMinor: 350 },
            ],
            "Cheese Choice": [
              { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
            ],
          },
        },
      ])
    ).rejects.toThrow(/Modifier group 'Patty Selection'.*allows at most 1 selection/i);

    // 10g. Inactive or unavailable option must be rejected
    const item1 = await catalogService.getMenuItemById("item-1");
    const addonsGroup = item1?.modifierGroups?.find((g) => g.name === "Premium Add-ons");
    const avocadoOpt = addonsGroup?.options.find((o) => o.id === "opt-avocado");
    expect(avocadoOpt).toBeDefined();
    try {
      avocadoOpt!.isActive = false;
      await expect(
        catalogService.resolveAuthoritativeOrderItems([
          {
            menuItemId: "item-1",
            name: "The Truffle Umami Smashed Burger",
            basePriceMinor: 1599,
            quantity: 1,
            selectedModifiers: {
              "Patty Selection": [
                { id: "opt-single", name: "Single Patty (1/4 lb)", priceDeltaMinor: 0 },
              ],
              "Cheese Choice": [
                { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
              ],
              "Premium Add-ons": [
                { id: "opt-avocado", name: "Hass Avocado Slices", priceDeltaMinor: 175 },
              ],
            },
          },
        ])
      ).rejects.toThrow(/currently inactive or unavailable/i);
    } finally {
      if (avocadoOpt) {
        delete avocadoOpt.isActive;
      }
    }

    // 10h. Direct POST /api/v1/orders cannot bypass modifier validation
    const bypassOrderReq = new NextRequest("http://localhost:3000/api/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceMode: "PICKUP",
        branchId: "branch-1",
        customer: {
          fullName: "Bypass Tester",
          email: "bypass@example.com",
          phone: "555-9000",
        },
        items: [
          {
            menuItemId: "item-1",
            name: "The Truffle Umami Smashed Burger",
            basePriceMinor: 1599,
            quantity: 1,
            selectedModifiers: {
              "Patty Selection": [
                { id: "opt-bacon", name: "Wrong Group Option", priceDeltaMinor: 200 },
              ],
              "Cheese Choice": [
                { id: "opt-cheddar", name: "Aged Sharp Cheddar", priceDeltaMinor: 0 },
              ],
            },
          },
        ],
      }),
    });
    const bypassOrderRes = await postOrdersRoute(bypassOrderReq);
    expect(bypassOrderRes.status).toBe(400);
    const bypassOrderJson = await bypassOrderRes.json();
    expect(bypassOrderJson.error.code).toBe("VALIDATION_ERROR");
  });

  it("11. enforces concurrency-safe order status transitions (competing transitions, stale updates, and DB conditional update check)", async () => {
    // Create a fresh order and transition to CONFIRMED
    const order = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Concurrency Tester",
        email: "race@example.com",
        phone: "555-7777",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 1,
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    await orderService.transitionStatus(order.id, "PAID", "Payment captured");
    await orderService.transitionStatus(order.id, "CONFIRMED", "Order confirmed");

    const historyCountBeforeRace = (await orderService.getOrderById(order.id))!
      .statusHistory.length;
    const outboxCountBeforeRace = orderService
      .getOutboxEvents()
      .filter((e) => e.aggregateId === order.id && e.eventType === "order.status_changed")
      .length;

    // 11a. Competing concurrent transitions (CONFIRMED -> ACCEPTED vs CONFIRMED -> CANCELLED)
    const competingResults = await Promise.allSettled([
      orderService.transitionStatus(order.id, "ACCEPTED", "Kitchen operator A accepted"),
      orderService.transitionStatus(order.id, "CANCELLED", "Concurrent cancellation attempt"),
    ]);

    const fulfilled = competingResults.filter((r) => r.status === "fulfilled");
    const rejected = competingResults.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected"
    );

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.code).toBe("CONFLICT");
    expect(rejected[0].reason.statusCode).toBe(409);

    const afterRaceOrder = (await orderService.getOrderById(order.id))!;
    expect(afterRaceOrder.status).toBe("ACCEPTED");
    // Only ONE status history entry and ONE outbox event may be recorded
    expect(afterRaceOrder.statusHistory.length).toBe(historyCountBeforeRace + 1);
    const outboxCountAfterRace = orderService
      .getOutboxEvents()
      .filter((e) => e.aggregateId === order.id && e.eventType === "order.status_changed")
      .length;
    expect(outboxCountAfterRace).toBe(outboxCountBeforeRace + 1);

    // 11b. Stale update with expectedPreviousStatus ('CONFIRMED' when current is 'ACCEPTED') must reject with 409 CONFLICT
    await expect(
      orderService.transitionStatus(
        order.id,
        "PREPARING",
        "Stale client assuming order was still CONFIRMED",
        "CONFIRMED"
      )
    ).rejects.toThrow(/Stale status transition/i);

    // 11c. Simulated PostgreSQL transaction conditional-update conflict (0 rows returned by UPDATE ... WHERE id = $1 AND status = $2)
    process.env.DATABASE_URL =
      "postgresql://fastfood_runtime_role:runtime_pass@localhost:5432/fast_food";

    const originalSelect = db.select;
    const originalTransaction = db.transaction;
    let historyInsertCalled = false;
    let outboxInsertCalled = false;

    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: order.id,
              orderNumber: order.orderNumber,
              trackingToken: order.trackingToken,
              idempotencyKey: null,
              branchId: order.branchId,
              serviceMode: order.serviceMode,
              status: "ACCEPTED",
              subtotalMinor: order.subtotalMinor,
              deliveryFeeMinor: order.deliveryFeeMinor,
              discountMinor: order.discountMinor,
              taxMinor: order.taxMinor,
              totalMinor: order.totalMinor,
              couponCode: null,
              guestName: order.guestName,
              guestEmail: order.guestEmail,
              guestPhone: order.guestPhone,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
        }),
      }),
    });

    (db as any).transaction = async (callback: (tx: any) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: () => ({
            where: () => ({
              // Simulate another concurrent transaction changing the row's status first -> 0 rows updated
              returning: async () => [],
            }),
          }),
        }),
        insert: () => ({
          values: async () => {
            historyInsertCalled = true;
            outboxInsertCalled = true;
          },
        }),
      };
      return callback(mockTx);
    };

    try {
      await expect(
        orderService.transitionStatus(order.id, "PREPARING", "Concurrent DB test")
      ).rejects.toThrow(/Concurrent status update conflict/i);
      expect(historyInsertCalled).toBe(false);
      expect(outboxInsertCalled).toBe(false);
    } finally {
      (db as any).select = originalSelect;
      (db as any).transaction = originalTransaction;
      delete process.env.DATABASE_URL;
    }
  });

  it("12. preserves 3D burger rotation angle across pause/resume and separates WebGL scene lifecycle from rotation toggle", () => {
    let angle = 0;
    // Advance 3 frames while rotating
    angle = advanceBurgerRotationAngle(angle, true, 0.008);
    angle = advanceBurgerRotationAngle(angle, true, 0.008);
    angle = advanceBurgerRotationAngle(angle, true, 0.008);
    expect(angle).toBeCloseTo(0.024, 6);

    // Pause rotation for several frames -> angle must remain preserved at 0.024
    const pausedAngle = advanceBurgerRotationAngle(angle, false, 0.008);
    expect(pausedAngle).toBe(angle);

    // Resume rotation -> continues from 0.024 rather than resetting to 0
    const resumedAngle = advanceBurgerRotationAngle(pausedAngle, true, 0.008);
    expect(resumedAngle).toBeCloseTo(0.032, 6);

    // Verify burger-canvas.tsx separates scene initialization from isRotating and disposes geometries/materials
    const burgerCanvasSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/components/about/burger-canvas.tsx"),
      "utf8"
    );
    expect(burgerCanvasSource).toContain("isRotatingRef.current = isRotating;");
    expect(burgerCanvasSource).not.toContain("}, [isRotating]);\n\n  if (reducedMotion)");
    expect(burgerCanvasSource).toContain("geo.dispose()");
    expect(burgerCanvasSource).toContain("mat.dispose()");
    expect(burgerCanvasSource).toContain("renderer.dispose()");
  });

  it("13. enforces repository-relative Markdown links in OPERATIONAL-RUNBOOK.md and safe defaults in .env.example", () => {
    const runbookPath = path.resolve(process.cwd(), "docs/OPERATIONAL-RUNBOOK.md");
    const runbookContent = fs.readFileSync(runbookPath, "utf8");

    expect(runbookContent).not.toContain("file:///");
    const relativeLinks = Array.from(
      runbookContent.matchAll(/\]\((\.\/[^)]+)\)/g),
      (m) => m[1]
    );
    expect(relativeLinks.length).toBeGreaterThan(0);
    for (const relTarget of relativeLinks) {
      const resolvedTarget = path.resolve(path.dirname(runbookPath), relTarget);
      expect(fs.existsSync(resolvedTarget)).toBe(true);
    }

    const envExamplePath = path.resolve(process.cwd(), ".env.example");
    const envExampleContent = fs.readFileSync(envExamplePath, "utf8");
    expect(envExampleContent).toContain("PAYMENT_MODE=DISABLED");
    expect(envExampleContent).toContain("PAYMENT_MODE=MOCK");
    expect(envExampleContent).toContain("# DATABASE_URL=postgresql://");
    expect(envExampleContent).toContain("# MIGRATION_DATABASE_URL=postgresql://");
    expect(envExampleContent).not.toMatch(/^DATABASE_URL=/m);
    expect(envExampleContent).not.toMatch(/^MIGRATION_DATABASE_URL=/m);
    expect(envExampleContent).not.toContain("supabase.co");
    expect(envExampleContent).not.toContain("pooler.supabase.com");
  });

  it("14. enforces atomic payment webhook deduplication, transactional event insertion, and rollback safety", async () => {
    resetInMemoryPaymentStores();

    const order = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Webhook Dedupe Tester",
        email: "dedupe@example.com",
        phone: "555-8888",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 1,
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    const duplicateEventId = `evt_dedupe_test_${Date.now()}`;
    const payload = {
      eventId: duplicateEventId,
      provider: "STRIPE",
      eventType: "payment.succeeded" as const,
      orderId: order.id,
      amountMinor: order.totalMinor,
      currency: "USD",
    };

    // 14a. Concurrent deliveries of the exact same event in memory mode
    const [res1, res2] = await Promise.all([
      paymentService.processWebhook("STRIPE", "sig_valid_test", payload),
      paymentService.processWebhook("STRIPE", "sig_valid_test", payload),
    ]);

    expect((res1.processed && !res2.processed) || (!res1.processed && res2.processed)).toBe(true);
    expect(res1.deduplicated || res2.deduplicated).toBe(true);

    const paidOrder = await orderService.getOrderById(order.id);
    expect(paidOrder?.status).toBe("CONFIRMED");

    // 14b. Distinct event for an already confirmed order acknowledges cleanly without 409 error
    const alreadyConfirmedResult = await paymentService.processWebhook(
      "STRIPE",
      "sig_valid_test",
      {
        eventId: `evt_distinct_second_event_${Date.now()}`,
        provider: "STRIPE",
        eventType: "payment.succeeded",
        orderId: order.id,
        amountMinor: order.totalMinor,
        currency: "USD",
      }
    );
    expect(alreadyConfirmedResult.processed).toBe(false);
    expect(alreadyConfirmedResult.deduplicated).toBe(true);

    // 14c. Failed payment attempt does not cancel the order in PENDING_PAYMENT, allowing customer retry
    const retryOrder = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Retry Customer",
        email: "retry@example.com",
        phone: "555-9876",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 1,
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    const failedResult = await paymentService.processWebhook(
      "STRIPE",
      "sig_valid_test",
      {
        eventId: `evt_failed_test_${Date.now()}`,
        provider: "STRIPE",
        eventType: "payment.failed",
        orderId: retryOrder.id,
        amountMinor: retryOrder.totalMinor,
        currency: "USD",
      }
    );
    expect(failedResult.processed).toBe(true);
    const orderAfterFailedPayment = await orderService.getOrderById(retryOrder.id);
    expect(orderAfterFailedPayment?.status).toBe("PENDING_PAYMENT");

    // 14d. Database transaction deduplication: simulated PostgreSQL unique constraint conflict
    process.env.DATABASE_URL =
      "postgresql://fastfood_runtime_role:runtime_pass@localhost:5432/fast_food";

    const originalTransaction = db.transaction;
    let transitionAttemptedInConflict = false;

    // Simulate db.transaction where tx.insert(paymentEvents).onConflictDoNothing().returning() yields 0 rows
    (db as any).transaction = async (callback: (tx: any) => Promise<any>) => {
      const mockTx = {
        insert: () => ({
          values: () => ({
            onConflictDoNothing: () => ({
              // 0 rows returned = duplicate event collision on payment_events_provider_event_idx
              returning: async () => [],
            }),
          }),
        }),
        select: () => {
          transitionAttemptedInConflict = true;
          return { from: () => ({ where: () => ({ limit: async () => [] }) }) };
        },
        update: () => {
          transitionAttemptedInConflict = true;
          return { set: () => ({ where: async () => [] }) };
        },
      };
      return callback(mockTx);
    };

    try {
      const dedupeResult = await paymentService.processWebhook(
        "STRIPE",
        "sig_valid_test",
        {
          eventId: `evt_db_collision_${Date.now()}`,
          provider: "STRIPE",
          eventType: "payment.succeeded",
          orderId: order.id,
          amountMinor: order.totalMinor,
          currency: "USD",
        }
      );

      expect(dedupeResult.processed).toBe(false);
      expect(dedupeResult.deduplicated).toBe(true);
      // When 0 rows returned by onConflictDoNothing, no order lookup or transition is executed
      expect(transitionAttemptedInConflict).toBe(false);
    } finally {
      (db as any).transaction = originalTransaction;
      delete process.env.DATABASE_URL;
    }
  });

  it("15. reuses compatible existing payment intents rather than creating redundant pending rows", async () => {
    resetInMemoryPaymentStores();

    const order = await orderService.createOrder({
      serviceMode: "PICKUP",
      branchId: "branch-1",
      customer: {
        fullName: "Intent Reuse Tester",
        email: "intent@example.com",
        phone: "555-4321",
      },
      items: [
        {
          menuItemId: "item-5",
          name: "Nashville Hot Fried Chicken Sandwich",
          basePriceMinor: 1349,
          quantity: 1,
          selectedModifiers: {
            "Spice Level": [
              { id: "opt-heat-mild", name: "Mild Herb & Garlic", priceDeltaMinor: 0 },
            ],
          },
        },
      ],
    });

    // 15a. First call creates the intent
    const firstIntent = await paymentService.createPaymentIntent(order.id, "MOCK");
    expect(firstIntent.intentId).toBeDefined();
    expect(firstIntent.clientSecret).toBeDefined();
    expect(firstIntent.amountMinor).toBe(order.totalMinor);
    expect(firstIntent.orderStatus).toBe("PENDING_PAYMENT");

    // 15b. Second call for the same order and provider reuses the exact same intent without creating a redundant one
    const secondIntent = await paymentService.createPaymentIntent(order.id, "MOCK");
    expect(secondIntent.intentId).toBe(firstIntent.intentId);
    expect(secondIntent.clientSecret).toBe(firstIntent.clientSecret);
    expect(secondIntent.amountMinor).toBe(firstIntent.amountMinor);

    // 15c. Reusing intent in database mode when a matching row exists
    process.env.DATABASE_URL =
      "postgresql://fastfood_runtime_role:runtime_pass@localhost:5432/fast_food";
    const originalSelect = db.select;
    const originalInsert = db.insert;
    let dbInsertCalled = false;
    const getOrderByIdSpy = vi.spyOn(orderService, "getOrderById").mockResolvedValue(order as any);

    (db as any).select = () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              id: "pay-existing-123",
              orderId: order.id,
              provider: "MOCK",
              providerIntentId: "pi_existing_mock_intent_abc",
              status: "REQUIRES_PAYMENT_METHOD",
              amountMinor: order.totalMinor,
              currency: "USD",
              metadata: { clientSecret: "pi_existing_secret_123" },
            },
          ],
        }),
      }),
    });

    (db as any).insert = () => {
      dbInsertCalled = true;
      return { values: () => ({ onConflictDoNothing: async () => [] }) };
    };

    try {
      const dbReusedIntent = await paymentService.createPaymentIntent(order.id, "MOCK");
      expect(dbReusedIntent.intentId).toBe("pi_existing_mock_intent_abc");
      expect(dbReusedIntent.clientSecret).toBe("pi_existing_secret_123");
      expect(dbInsertCalled).toBe(false);
    } finally {
      getOrderByIdSpy.mockRestore();
      (db as any).select = originalSelect;
      (db as any).insert = originalInsert;
      delete process.env.DATABASE_URL;
    }
  });

  it("16. validates contact API submissions and enforces real storage/delivery acceptance", async () => {
    // Ensure clean initial state (no provider configured)
    contactService.setStorageProvider(null);

    // 16a. Missing fields rejected before reaching storage
    const emptyReq = new NextRequest("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", email: "", message: "" }),
    });
    const emptyRes = await postContactRoute(emptyReq);
    expect(emptyRes.status).toBe(400);
    const emptyJson = await emptyRes.json();
    expect(emptyJson.error.code).toBe("VALIDATION_ERROR");

    // 16b. Invalid email format rejected before reaching storage
    const invalidEmailReq = new NextRequest("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alex", email: "not-an-email", message: "Need kitchen support" }),
    });
    const invalidEmailRes = await postContactRoute(invalidEmailReq);
    expect(invalidEmailRes.status).toBe(400);

    // 16c. When no storage provider or delivery service is configured, fail closed with 503
    // Do NOT return false HTTP 200 "success" when the message is not stored or delivered
    const unconfiguredReq = new NextRequest("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Rivera",
        email: "alex@example.com",
        message: "Can I request extra truffle aioli on the side?",
      }),
    });
    const unconfiguredRes = await postContactRoute(unconfiguredReq);
    expect(unconfiguredRes.status).toBe(503);
    const unconfiguredJson = await unconfiguredRes.json();
    expect(unconfiguredJson.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(unconfiguredJson.error.message).toMatch(/temporarily disabled/i);

    // 16d. GET /api/v1/contact reports submissionSupported: false when unconfigured
    const getDisabledRes = await getContactRoute();
    expect(getDisabledRes.status).toBe(200);
    const getDisabledJson = await getDisabledRes.json();
    expect(getDisabledJson.data.submissionSupported).toBe(false);
    expect(getDisabledJson.data.directChannels.email).toBe("support@smashandsizzle.com");

    // 16e. When a real persistence provider is registered, submission returns 200
    // AND we prove that the inquiry was ACTUALLY accepted and persisted in the storage mechanism
    const memoryProvider = new InMemoryContactStorageProvider();
    contactService.setStorageProvider(memoryProvider);

    const validReq = new NextRequest("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Rivera",
        email: "alex@example.com",
        message: "Can I request extra truffle aioli on the side?",
      }),
    });
    const validRes = await postContactRoute(validReq);
    expect(validRes.status).toBe(200);
    const validJson = await validRes.json();
    expect(validJson.data.success).toBe(true);
    expect(validJson.data.provider).toBe("IN_MEMORY_PERSISTENCE");
    const inquiryId = validJson.data.inquiryId;
    expect(typeof inquiryId).toBe("string");

    // CRITICAL: Prove the inquiry was ACTUALLY stored in the persistent backend,
    // not merely that an HTTP 200 was returned.
    const storedInquiry = await memoryProvider.getInquiryById(inquiryId);
    expect(storedInquiry).not.toBeNull();
    expect(storedInquiry?.id).toBe(inquiryId);
    expect(storedInquiry?.name).toBe("Alex Rivera");
    expect(storedInquiry?.email).toBe("alex@example.com");
    expect(storedInquiry?.message).toBe("Can I request extra truffle aioli on the side?");
    expect(storedInquiry?.status).toBe("RECEIVED");
    expect(storedInquiry?.createdAt).toBeDefined();

    // 16f. In production, InMemoryContactStorageProvider is strictly blocked
    (process.env as any).NODE_ENV = "production";
    const prodReq = new NextRequest("http://localhost:3000/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alex Rivera",
        email: "alex@example.com",
        message: "Can I request extra truffle aioli on the side?",
      }),
    });
    const prodRes = await postContactRoute(prodReq);
    expect(prodRes.status).toBe(500);
    const prodJson = await prodRes.json();
    expect(prodJson.error.code).toBe("CONFIG_ERROR");

    // Clean up provider and environment
    (process.env as any).NODE_ENV = "test";
    contactService.setStorageProvider(null);
  });
});



