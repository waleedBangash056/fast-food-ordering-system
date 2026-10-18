import { NextRequest, NextResponse } from "next/server";
import { catalogService } from "@/server/domains/catalog/catalog-service";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorySlug = searchParams.get("category") || undefined;
    const featured = searchParams.get("featured") === "true";

    const items = await catalogService.getMenuItems({
      categorySlug,
      featuredOnly: featured,
    });

    return NextResponse.json({
      data: items,
      meta: {
        total: items.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch menu items." } },
      { status: 500 }
    );
  }
}
