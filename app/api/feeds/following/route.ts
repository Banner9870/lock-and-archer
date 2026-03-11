import { NextResponse } from "next/server";
import { getDid } from "@/lib/auth/session";
import { getFollowingFeedForUser } from "@/lib/feeds/unified";

export async function GET() {
  const did = await getDid();
  if (!did) {
    return NextResponse.json({ error: "Sign in to view your following feed." }, { status: 401 });
  }

  const limit = 50;
  const items = await getFollowingFeedForUser(did, limit);
  return NextResponse.json({ items });
}
