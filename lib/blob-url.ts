/**
 * Build the app's blob proxy URL for a given DID and CID.
 * Use for avatars and any blob images so the browser never hits PDS getBlob directly.
 */

function getPublicOrigin(): string {
  const raw = process.env.PUBLIC_URL?.trim();
  if (raw) {
    try {
      const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return url.origin;
    } catch {
      // fall through
    }
  }
  return "http://localhost:3000";
}

/**
 * Returns the full URL to our blob proxy for this DID and CID.
 * Example: https://your-app.up.railway.app/api/blob?did=did:plc:xxx&cid=bafkreixxx
 */
export function blobProxyUrl(did: string, cid: string): string {
  const origin = getPublicOrigin();
  const params = new URLSearchParams({ did, cid });
  return `${origin}/api/blob?${params.toString()}`;
}
