import { NextResponse } from "next/server";
import { catalogService } from "@/server/domains/catalog/catalog-service";

export async function GET() {
  try {
    const categories = await catalogService.getCategories();
    return NextResponse.json({
      data: categories,
    });
  } catch (error) {
    console.error("[Categories Route Error]", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch categories." } },
      { status: 500 }
    );
  }

}
