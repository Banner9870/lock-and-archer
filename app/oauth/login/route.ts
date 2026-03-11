import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, SCOPE } from "@/lib/auth/client";

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json();

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Handle is required" },
        { status: 400 }
      );
    }

    const client = await getOAuthClient();

    // Resolves handle, finds their auth server, returns authorization URL
    const authUrl = await client.authorize(handle, {
      scope: SCOPE,
    });

    return NextResponse.json({ redirectUrl: authUrl.toString() });
  } catch (error) {
    console.error("OAuth login error:", error);
    const message = error instanceof Error ? error.message : "Login failed";
    // Help users who use the wrong handle (e.g. README example vs their actual PDS hostname)
    const hint =
      message.includes("Failed to resolve identity") || message.includes("resolve identity")
        ? " Use the handle that matches your PDS hostname (e.g. alice.your-pds-hostname.up.railway.app). See the PDS README troubleshooting section."
        : "";
    return NextResponse.json(
      { error: message + hint },
      { status: 500 }
    );
  }
}

