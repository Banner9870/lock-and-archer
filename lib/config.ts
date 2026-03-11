/**
 * PDS_APP_URL is the full URL of our optional PDS (e.g. https://lock-and-archer-pds.up.railway.app).
 * Used for handle resolution and for the create-account flow.
 */
function getPdsAppUrl(): URL | null {
  const raw = process.env.PDS_APP_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export function isCreateAccountAvailable(): boolean {
  return getPdsAppUrl() != null;
}

/** Hostname of the PDS (e.g. lock-and-archer-pds.up.railway.app) for building suggested handles. */
export function getPdsHostnameForSignup(): string | null {
  return getPdsAppUrl()?.hostname ?? null;
}

export function getPdsAppUrlOrNull(): URL | null {
  return getPdsAppUrl();
}
