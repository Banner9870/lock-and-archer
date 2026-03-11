import { NextRequest, NextResponse } from "next/server";
import { getUnifiedFeedItems } from "@/lib/feeds/unified";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") ?? "30", 10) || 30)
  );

  const items = await getUnifiedFeedItems(limit, null);
  return NextResponse.json({ items });
}
