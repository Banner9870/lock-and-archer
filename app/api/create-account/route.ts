import { NextRequest, NextResponse } from "next/server";
import { getPdsAppUrlOrNull } from "@/lib/config";

/**
 * POST /api/create-account
 * Proxies to PDS com.atproto.server.createAccount.
 * Requires PDS_APP_URL to be set. Handle must be under the PDS hostname.
 */
export async function POST(request: NextRequest) {
  const pdsUrl = getPdsAppUrlOrNull();
  if (!pdsUrl) {
    return NextResponse.json(
      { error: "Create account is not configured (PDS_APP_URL missing)." },
      { status: 503 }
    );
  }

  let body: { handle?: string; password?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const emailInput = typeof body.email === "string" ? body.email.trim() : "";

  if (!handle || !password) {
    return NextResponse.json(
      { error: "handle and password are required" },
      { status: 400 }
    );
  }

  const pdsHost = pdsUrl.hostname.toLowerCase();
  // Handle must be either exactly the host or subdomain.host (e.g. alice.pds.example.com)
  const handleDomain = handle.includes(".") ? handle.slice(handle.indexOf(".") + 1) : handle;
  if (handleDomain !== pdsHost) {
    return NextResponse.json(
      { error: `Handle must be under this PDS (e.g. username.${pdsHost})` },
      { status: 400 }
    );
  }

  // PDS may require email; use a placeholder when omitted so signup works without email (testing).
  const email = emailInput || `${handle.replace(/\./g, "-")}@placeholder.invalid`;

  const createAccountUrl = new URL("/xrpc/com.atproto.server.createAccount", pdsUrl);
  const res = await fetch(createAccountUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle, password, email }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = typeof data.message === "string" ? data.message : data.error ?? "Account creation failed";
    return NextResponse.json(
      { error: message, code: data.error },
      { status: res.status >= 400 && res.status < 600 ? res.status : 500 }
    );
  }

  return NextResponse.json({ handle: data.handle ?? handle });
}
