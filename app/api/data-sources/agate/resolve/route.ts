import { NextRequest, NextResponse } from "next/server";
import { getDataSourceAdapter } from "@/lib/data-sources/registry";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId")?.trim();
  if (!sourceId) {
    return NextResponse.json(
      { error: "Missing sourceId" },
      { status: 400 }
    );
  }

  const adapter = getDataSourceAdapter("agate");
  if (!adapter) {
    return NextResponse.json(
      { error: "Agate source not available" },
      { status: 503 }
    );
  }

  const item = await adapter.resolveById(sourceId);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(item);
}
