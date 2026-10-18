import { NextRequest, NextResponse } from "next/server";
import { catalogService } from "@/server/domains/catalog/catalog-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const item = await catalogService.getMenuItemBySlug(slug);

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Menu item with slug '${slug}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: item,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch product details." } },
      { status: 500 }
    );
  }
}
