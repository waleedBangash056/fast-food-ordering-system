import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { FASTFOOD_SCHEMA } from "./index";
import * as schema from "./schema";
import {
  categories,
  menuItems,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  branches,
  coupons,
} from "./schema";
import {
  SEED_CATEGORIES,
  SEED_MENU_ITEMS,
  SEED_BRANCHES,
  SEED_COUPONS,
} from "./seed-data";

/**
 * Resolves and validates the dedicated migration/seeding connection string (`MIGRATION_DATABASE_URL`).
 * Never falls back to `DATABASE_URL` (which belongs to the least-privilege `fastfood_runtime_role`).
 */
export function resolveSeedDatabaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string {
  const url = env.MIGRATION_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "MIGRATION_DATABASE_URL is required for database seeding (must connect as fastfood_migrator_role). Refusing to fall back to runtime DATABASE_URL."
    );
  }
  return url;
}

/**
 * Creates a dedicated, short-lived connection pool and Drizzle client bound to `MIGRATION_DATABASE_URL`
 * rather than reusing the runtime `DATABASE_URL` pool from `src/lib/db/index.ts`.
 */
export function createSeedDatabaseConnection(
  env: NodeJS.ProcessEnv = process.env
): {
  connectionString: string;
  pool: Pool;
  db: NodePgDatabase<typeof schema>;
} {
  const connectionString = resolveSeedDatabaseUrl(env);
  const seedPool = new Pool({
    connectionString,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

  seedPool.on("connect", (client) => {
    client.query(`SET search_path TO ${FASTFOOD_SCHEMA}`).catch(() => {
      // Handled by explicit fastfood_app table qualification in schema.ts
    });
  });

  const seedDb = drizzle(seedPool, { schema });
  return {
    connectionString,
    pool: seedPool,
    db: seedDb,
  };
}

export async function runSeed(
  env: NodeJS.ProcessEnv = process.env
): Promise<void> {
  const { pool: seedPool, db: seedDb } = createSeedDatabaseConnection(env);

  console.log("Seeding fastfood_app schema via dedicated MIGRATION_DATABASE_URL connection...");

  try {
    // 1. Categories
    for (const cat of SEED_CATEGORIES) {
      await seedDb
        .insert(categories)
        .values({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          displayOrder: cat.displayOrder,
          isActive: true,
        })
        .onConflictDoNothing();
    }

    // 2. Branches
    for (const b of SEED_BRANCHES) {
      await seedDb
        .insert(branches)
        .values({
          id: b.id,
          name: b.name,
          slug: b.slug,
          address: b.address,
          phone: b.phone,
          email: b.email,
          latitude: b.latitude,
          longitude: b.longitude,
          deliveryFeeMinor: b.deliveryFeeMinor,
          minOrderMinor: b.minOrderMinor,
          isActive: true,
          acceptOrders: true,
        })
        .onConflictDoNothing();
    }

    // 3. Menu Items & Modifier Groups/Options
    for (const item of SEED_MENU_ITEMS) {
      await seedDb
        .insert(menuItems)
        .values({
          id: item.id,
          categoryId: item.categoryId,
          name: item.name,
          slug: item.slug,
          description: item.description,
          basePriceMinor: item.basePriceMinor,
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable ?? true,
          isFeatured: item.isFeatured,
          displayOrder: item.displayOrder,
          calories: item.calories,
          prepTimeMinutes: item.prepTimeMinutes,
          isHalal: item.isHalal ?? false,
          isGlutenFree: item.isGlutenFree ?? false,
          isVegan: item.isVegan ?? false,
          isVegetarian: item.isVegetarian ?? false,
          isSpicy: item.isSpicy ?? false,
          modifierGroupsJson: item.modifierGroups ?? [],
        })
        .onConflictDoNothing();

      if (item.modifierGroups) {
        for (let idx = 0; idx < item.modifierGroups.length; idx++) {
          const group = item.modifierGroups[idx];
          await seedDb
            .insert(modifierGroups)
            .values({
              id: group.id,
              name: group.name,
              selectionType: group.selectionType,
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              isRequired: group.isRequired,
            })
            .onConflictDoNothing();

          for (let optIdx = 0; optIdx < group.options.length; optIdx++) {
            const opt = group.options[optIdx];
            await seedDb
              .insert(modifierOptions)
              .values({
                id: opt.id,
                modifierGroupId: group.id,
                name: opt.name,
                priceDeltaMinor: opt.priceDeltaMinor,
                isDefault: opt.isDefault,
                isActive: true,
                displayOrder: optIdx,
              })
              .onConflictDoNothing();
          }

          await seedDb
            .insert(menuItemModifierGroups)
            .values({
              id: `${item.id}_${group.id}`,
              menuItemId: item.id,
              modifierGroupId: group.id,
              displayOrder: idx,
            })
            .onConflictDoNothing();
        }
      }
    }

    // 4. Coupons
    const now = new Date();
    const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    for (const c of SEED_COUPONS) {
      await seedDb
        .insert(coupons)
        .values({
          id: `coupon-${c.code.toLowerCase()}`,
          code: c.code,
          description: c.description,
          discountType: c.discountType,
          discountValue: c.discountValue,
          minSubtotalMinor: c.minSubtotalMinor,
          maxDiscountMinor: c.maxDiscountMinor || null,
          startsAt: now,
          expiresAt: nextYear,
          isActive: c.isActive,
        })
        .onConflictDoNothing();
    }

    console.log("fastfood_app database seeded idempotently.");
  } finally {
    await seedPool.end();
  }
}

if (process.argv[1]?.includes("seed.ts")) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}


