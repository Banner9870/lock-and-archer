import { NextRequest, NextResponse } from "next/server";
import { Client, l } from "@atproto/lex";
import { getSession } from "@/lib/auth/session";
import { getOAuthClient } from "@/lib/auth/client";
import { isStatusphereEnabled } from "@/lib/config";
import * as xyz from "@/src/lexicons/xyz";
import { insertStatus, upsertAccount, getAccountHandle } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  if (!isStatusphereEnabled()) {
    return NextResponse.json(
      { error: "Statusphere is disabled" },
      { status: 404 }
    );
  }
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

    // Write-through: so this status shows in Recent immediately without waiting for Tap.
    // Tap will still send events and we'll upsert; this ensures the feed isn't empty when Tap isn't configured.
    const handle =
      (await getAccountHandle(session.did)) ?? session.did;
    await upsertAccount({
      did: session.did,
      handle,
      active: 1,
    });
    await insertStatus({
      uri: res.uri,
      authorDid: session.did,
      status,
      createdAt,
      indexedAt: new Date().toISOString(),
      current: 1,
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
