import { NextRequest, NextResponse } from "next/server";
import { resolveDidToPdsUrl } from "@/lib/did-resolve";
import { getPdsAppUrlOrNull } from "@/lib/config";

/** Allowlist of MIME types we will serve. Others are rejected. */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

function isValidCid(cid: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(cid) && cid.length >= 20 && cid.length <= 200;
}

function isValidDid(did: string): boolean {
  return /^did:(plc|web):[a-zA-Z0-9._:-]+$/.test(did) && did.length <= 200;
}

/**
 * GET /api/blob?did=...&cid=...
 * Proxies com.atproto.sync.getBlob from the account's PDS with security headers.
 * Use this URL for avatars and any blob images (do not point browser at PDS getBlob).
 * Railway: no extra config; optional Cloudflare in front to cache at edge.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const did = searchParams.get("did")?.trim();
  const cid = searchParams.get("cid")?.trim();

  if (!did || !cid) {
    return NextResponse.json(
      { error: "Missing did or cid" },
      { status: 400 }
    );
  }
  if (!isValidDid(did) || !isValidCid(cid)) {
    return NextResponse.json(
      { error: "Invalid did or cid" },
      { status: 400 }
    );
  }

  // Resolve DID to PDS base URL; fall back to our PDS_APP_URL when resolution fails (e.g. DID on our PDS).
  let pdsBase: string | null = await resolveDidToPdsUrl(did);
  if (!pdsBase) {
    const ourPds = getPdsAppUrlOrNull();
    pdsBase = ourPds?.origin ?? null;
  }
  if (!pdsBase) {
    return NextResponse.json(
      { error: "Could not resolve PDS for DID" },
      { status: 502 }
    );
  }

  const getBlobUrl = `${pdsBase}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;

  let upstream: Response;
  try {
    upstream = await fetch(getBlobUrl, {
      method: "GET",
      headers: { Accept: "*/*" },
      redirect: "follow",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch blob from PDS" },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Blob not found or unavailable" },
      { status: upstream.status === 404 ? 404 : 502 }
    );
  }

  const contentType = upstream.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported blob type" },
      { status: 415 }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);

  return new NextResponse(upstream.body, {
    status: 200,
    headers,
  });
}
