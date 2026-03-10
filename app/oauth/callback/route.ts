import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/auth/client";

function getRedirectBase(): string {
  const raw = process.env.PUBLIC_URL?.trim();
  if (!raw) return "http://127.0.0.1:3000";
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return "http://127.0.0.1:3000";
  }
}

export async function GET(request: NextRequest) {
  const redirectBase = getRedirectBase();
  try {
    const params = request.nextUrl.searchParams;
    const client = await getOAuthClient();

    // Exchange code for session
    const { session } = await client.callback(params);

    const response = NextResponse.redirect(new URL("/", redirectBase));

    // Set DID cookie
    response.cookies.set("did", session.did, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/?error=login_failed", redirectBase));
  }
}

