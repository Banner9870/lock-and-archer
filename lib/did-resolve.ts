/**
 * Resolve a DID to its handle by fetching the DID document from the network.
 * Supports did:plc (via plc.directory) and did:web (via .well-known/did.json).
 * Per spec: first at:// URI in alsoKnownAs is the claimed handle.
 * @see https://atproto.com/specs/did
 * @see https://atproto.com/specs/handle
 */
export async function resolveDidToHandle(did: string): Promise<string | null> {
  try {
    const doc = await fetchDidDocument(did);
    const aka = doc?.alsoKnownAs;
    if (!Array.isArray(aka)) return null;
    for (let i = 0; i < aka.length; i++) {
      const alias = aka[i];
      if (typeof alias === "string" && alias.startsWith("at://")) {
        return alias.slice(5); // strip "at://"
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve a DID to its PDS base URL (e.g. https://bsky.social) for getBlob and other XRPC.
 * Reads the DID document's service array for type AtprotoPersonalDataServer.
 */
export async function resolveDidToPdsUrl(did: string): Promise<string | null> {
  try {
    const doc = await fetchDidDocument(did);
    const services = doc?.service;
    if (!Array.isArray(services)) return null;
    for (const svc of services) {
      if (svc && typeof svc === "object" && (svc as { type?: string }).type === "AtprotoPersonalDataServer") {
        const endpoint = (svc as { serviceEndpoint?: string | { uri?: string } }).serviceEndpoint;
        if (typeof endpoint === "string" && endpoint.startsWith("http")) return endpoint.replace(/\/+$/, "");
        if (endpoint && typeof endpoint === "object" && typeof (endpoint as { uri?: string }).uri === "string") {
          const uri = (endpoint as { uri: string }).uri;
          if (uri.startsWith("http")) return uri.replace(/\/+$/, "");
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchDidDocument(did: string): Promise<Record<string, unknown> | null> {
  if (did.startsWith("did:plc:")) {
    const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    return json;
  }
  if (did.startsWith("did:web:")) {
    const hostname = did.slice("did:web:".length).replace(/:/g, "/");
    const url = `https://${hostname}/.well-known/did.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    return json;
  }
  return null;
}
