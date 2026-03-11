import { NextRequest, NextResponse } from "next/server";
import { getDataSourceAdapter } from "@/lib/data-sources/registry";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const adapter = getDataSourceAdapter("chicago-events");
  if (!adapter) {
    return NextResponse.json(
      { error: "Chicago events source not available" },
      { status: 503 }
    );
  }

  if (!adapter.search) {
    return NextResponse.json({ items: [] });
  }

  const items = await adapter.search(q);
  return NextResponse.json({ items });
}
