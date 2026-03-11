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

export type StaffProperty = "sun-times" | "wbez" | "chicago.com";

function parseDidList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns which staff property lists contain the given DID. Used for property badges in the UI. */
export function getStaffProperties(did: string): StaffProperty[] {
  const out: StaffProperty[] = [];
  const sunTimes = parseDidList(process.env.SUN_TIMES_STAFF_DIDS);
  const wbez = parseDidList(process.env.WBEZ_STAFF_DIDS);
  const chicagoCom = parseDidList(process.env.CHICAGO_COM_STAFF_DIDS);
  if (sunTimes.includes(did)) out.push("sun-times");
  if (wbez.includes(did)) out.push("wbez");
  if (chicagoCom.includes(did)) out.push("chicago.com");
  return out;
}
