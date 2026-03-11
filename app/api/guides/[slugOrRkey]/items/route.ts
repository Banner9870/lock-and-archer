import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as com from "@/src/lexicons/com";
import {
  getGuideBySlug,
  getGuideByRkey,
  insertGuideItem,
} from "@/lib/db/queries";

type RouteParams = { params: Promise<{ slugOrRkey: string }> };

/** Body for adding an item to a guide (matches ResolvedItem from data sources). */
type AddItemBody = {
  sourceId: string;
  sourceLabel: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  type: "article" | "event" | "business";
  latitude?: number;
  longitude?: number;
  neighborhoodId?: string | null;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slugOrRkey } = await params;
  if (!slugOrRkey?.trim()) {
    return NextResponse.json({ error: "Missing guide slug or rkey" }, { status: 400 });
  }

  const guide =
    (await getGuideBySlug(slugOrRkey)) ?? (await getGuideByRkey(slugOrRkey));
  if (!guide) {
    return NextResponse.json({ error: "Guide not found" }, { status: 404 });
  }
  if (guide.authorDid !== session.did) {
    return NextResponse.json(
      { error: "You can only add items to your own guides" },
      { status: 403 }
    );
  }

  let body: AddItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
  const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel.trim() : "Agate";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const type = body.type === "article" || body.type === "event" || body.type === "business"
    ? body.type
    : "business";

  if (!sourceId || !title) {
    return NextResponse.json(
      { error: "sourceId and title are required" },
      { status: 400 }
    );
  }

  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() || undefined : undefined;
  const description = typeof body.description === "string" ? body.description.trim() || undefined : undefined;
  const lat = typeof body.latitude === "number" ? body.latitude : undefined;
  const lng = typeof body.longitude === "number" ? body.longitude : undefined;
  const neighborhoodId = body.neighborhoodId != null && body.neighborhoodId !== "" ? String(body.neighborhoodId) : null;

  try {
    const client = await getOAuthClient();
    const oauthSession = await client.restore(session.did);
    if (!oauthSession) {
      return NextResponse.json(
        { error: "Session expired or invalid. Please sign in again." },
        { status: 401 }
      );
    }

    const lexClient = new Client(oauthSession);
    const now = l.toDatetimeString(new Date());
    const record = {
      guideRef: guide.uri,
      type,
      sourceId,
      sourceUrl,
      sourceLabel,
      title,
      description,
      snapshotAt: now,
      createdAt: now,
      updatedAt: now,
      ...(lat != null && lng != null && { latitude: String(lat), longitude: String(lng) }),
      ...(neighborhoodId != null && { neighborhoodId }),
    };

    const created = await lexClient.create(com.cpm.guides.guideItem.main, record);
    const indexedAt = new Date().toISOString();

    await insertGuideItem({
      uri: created.uri,
      guideUri: guide.uri,
      authorDid: session.did,
      type,
      sourceId,
      sourceUrl: sourceUrl ?? "",
      sourceLabel,
      title,
      description: description ?? "",
      snapshotAt: now,
      indexedAt,
      latitude: lat ?? null,
      longitude: lng ?? null,
      neighborhoodId,
    });

    return NextResponse.json({
      success: true,
      uri: created.uri,
      guideUri: guide.uri,
      type,
      title,
      sourceId,
      sourceLabel,
    });
  } catch (error) {
    console.error("POST /api/guides/[slugOrRkey]/items error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
