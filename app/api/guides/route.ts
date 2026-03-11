import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as com from "@/src/lexicons/com";
import {
  insertGuide,
  listRecentGuides,
  listGuidesByAuthor,
  getAccountHandle,
} from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { title?: string; description?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : undefined;

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
      title,
      description: description || undefined,
      slug: slug || undefined,
      createdAt: now,
      updatedAt: now,
    };
    const res = await lexClient.create(com.cpm.guides.guide.main, record);

    const indexedAt = new Date().toISOString();
    await insertGuide({
      uri: res.uri,
      authorDid: session.did,
      title,
      description,
      slug: slug ?? "",
      forkedFrom: "",
      createdAt: now,
      updatedAt: now,
      indexedAt,
    });

    return NextResponse.json({
      success: true,
      uri: res.uri,
      title,
      description,
      slug: slug ?? null,
      rkey: res.uri.split("/").pop() ?? null,
    });
  } catch (error) {
    console.error("POST /api/guides error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create guide";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authorDid = searchParams.get("authorDid") ?? undefined;
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
  );

  const guides = authorDid
    ? await listGuidesByAuthor(authorDid, limit)
    : await listRecentGuides(limit);

  const withHandles = await Promise.all(
    guides.map(async (g) => {
      const handle = await getAccountHandle(g.authorDid);
      return {
        ...g,
        handle: handle ?? g.authorDid,
      };
    })
  );

  return NextResponse.json({ guides: withHandles });
}
