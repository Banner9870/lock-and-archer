import { NextRequest, NextResponse } from "next/server";
import { ingestSunTimesRss } from "@/lib/ingest/suntimes-rss";

const INGEST_CRON_SECRET = process.env.INGEST_CRON_SECRET?.trim();

function isAuthorized(request: NextRequest): boolean {
  if (!INGEST_CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === INGEST_CRON_SECRET || headerSecret === INGEST_CRON_SECRET;
}

/**
 * GET or POST: trigger Chicago Sun-Times RSS ingest.
 * Fetches https://chicago.suntimes.com/rss/index.xml and upserts into feed_article.
 * Safe to call from a cron job (e.g. daily). If INGEST_CRON_SECRET is set, requests
 * must include Authorization: Bearer <secret> or x-cron-secret: <secret>.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await ingestSunTimesRss();
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, count: result.count },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true, count: result.count });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
