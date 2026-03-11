import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import * as xyz from "@/src/lexicons/xyz";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await request.json();

  if (!status || typeof status !== "string") {
    return NextResponse.json(
      { error: "Status is required" },
      { status: 400 }
    );
  }

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
    const createdAt = l.toDatetimeString(new Date());
    const res = await lexClient.create(xyz.statusphere.status.main, {
      status,
      createdAt,
    });

    return NextResponse.json({
      success: true,
      uri: res.uri,
    });
  } catch (error) {
    console.error("POST /api/status error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
