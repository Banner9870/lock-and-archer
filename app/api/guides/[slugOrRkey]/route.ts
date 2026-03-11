import { NextRequest, NextResponse } from "next/server";
import {
  getGuideBySlug,
  getGuideByRkey,
  listItemsByGuideUri,
  getAccountHandle,
} from "@/lib/db/queries";

type RouteParams = { params: Promise<{ slugOrRkey: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { slugOrRkey } = await params;
  if (!slugOrRkey?.trim()) {
    return NextResponse.json({ error: "Missing slug or rkey" }, { status: 400 });
  }

  const guide =
    (await getGuideBySlug(slugOrRkey)) ??
    (await getGuideByRkey(slugOrRkey));

  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }

  const [items, handle] = await Promise.all([
    listItemsByGuideUri(guide.uri),
    getAccountHandle(guide.authorDid),
  ]);

  return NextResponse.json({
    guide: {
      ...guide,
      handle: handle ?? guide.authorDid,
    },
    items,
  });
}
