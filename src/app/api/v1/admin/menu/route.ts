import { NextResponse } from "next/server";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";

const CreateMenuItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  basePriceMinor: z.number().int().positive("Price must be a positive integer in cents"),
  categoryId: z.string().min(1, "Category is required"),
  imageUrl: z.string().url("Valid image URL required").optional(),
  prepTimeMinutes: z.number().int().min(1).default(10),
  calories: z.number().int().min(50).default(650),
  isHalal: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isVegetarian: z.boolean().default(false),
  isSpicy: z.boolean().default(false),
  actorRole: z.string().default("ADMIN"),
  actorId: z.string().default("usr-admin-1"),
});

import { requireCapability } from "@/lib/auth/server-guard";

export async function GET(request: Request) {
  try {
    await requireCapability("MENU_READ", request);
    const items = await catalogService.getMenuItems();
    const categories = await catalogService.getCategories();
    return NextResponse.json({
      success: true,
      data: {
        items,
        categories,
        totalItems: items.length,
      },
    });
  } catch (error) {
    const err = error as AppError;
    return NextResponse.json(
      { success: false, error: { code: err.code || "INTERNAL_SERVER_ERROR", message: err.message || "Failed to fetch menu items" } },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authoritative Backend Authorization
    const session = await requireCapability("MENU_WRITE", request);

    const body = await request.json();
    const parsed = CreateMenuItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid menu item data",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const created = await catalogService.createMenuItem({
      ...parsed.data,
      actorRole: session.role,
      actorId: session.userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: `Menu item '${created.name}' created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    const err = error as AppError;
    return NextResponse.json(
      { success: false, error: { message: err.message || "Failed to create menu item" } },
      { status: err.statusCode || 500 }
    );
  }
}
