import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { requireCapability } from "@/lib/auth/server-guard";
import { AppError } from "@/lib/errors/app-error";

const BranchUpdateSchema = z.object({
  acceptOrders: z.boolean().optional(),
  maxCapacityOrdersPerHour: z.number().int().positive().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authoritative Backend Authorization
    const session = await requireCapability("BRANCH_MANAGE", request);

    const { id } = await params;
    const branch = await catalogService.getBranchById(id);

    if (!branch) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Branch '${id}' not found.` } },
        { status: 404 }
      );
    }

    // Branch isolation: Branch managers can only modify their own branch
    if (session.role === "BRANCH_MANAGER" && session.branchId !== id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: `Cannot modify branch '${id}' outside assigned branch.` } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = BranchUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid branch settings.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const updatedBranch = await catalogService.updateBranchSettings(
      id,
      parsed.data,
      session.role,
      session.userId
    );

    return NextResponse.json({
      data: updatedBranch,
    });
  } catch (error: any) {
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const errorCode = error instanceof AppError ? error.code : "INTERNAL_SERVER_ERROR";
    return NextResponse.json(
      { error: { code: errorCode, message: error.message || "Failed to update branch." } },
      { status: statusCode }
    );
  }
}

