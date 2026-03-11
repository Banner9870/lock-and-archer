import { NextRequest, NextResponse } from "next/server";
import { getUnifiedFeedItems } from "@/lib/feeds/unified";

type RouteParams = { params: Promise<{ communityId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { communityId } = await params;
  if (!communityId?.trim()) {
    return NextResponse.json(
      { error: "Missing community area id" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10) || 30)
  );

  const items = await getUnifiedFeedItems(
    limit,
    decodeURIComponent(communityId.trim())
  );
  return NextResponse.json({ items });
}
