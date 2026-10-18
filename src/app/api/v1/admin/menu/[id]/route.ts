import { NextResponse } from "next/server";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import { requireCapability } from "@/lib/auth/server-guard";

const UpdateMenuItemSchema = z
  .object({
    isAvailable: z.boolean().optional(),
    basePriceMinor: z.number().int().positive().optional(),
  })
  .refine(
    (data) => data.isAvailable !== undefined || data.basePriceMinor !== undefined,
    { message: "At least one field ('isAvailable' or 'basePriceMinor') must be provided." }
  );

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authoritative Backend Authorization
    const session = await requireCapability("MENU_WRITE", request);

    const { id } = await context.params;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Malformed or invalid JSON body.",
          },
        },
        { status: 400 }
      );
    }

    const parsed = UpdateMenuItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid update data",
          },
        },
        { status: 400 }
      );
    }

    const item = await catalogService.updateMenuItem(
      id,
      {
        isAvailable: parsed.data.isAvailable,
        basePriceMinor: parsed.data.basePriceMinor,
      },
      session.role,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: item,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update item",
        },
      },
      { status: 500 }
    );
  }
}
