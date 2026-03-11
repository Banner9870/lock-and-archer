/**
 * Agate adapter for Chicago places and community areas (Phase 3).
 * When AGATE_API_URL is not set, uses a stub with mock Chicago places for development.
 */

import type { DataSourceAdapter, ResolvedItem } from "./types";

const AGATE_API_URL = process.env.AGATE_API_URL?.trim() || null;
const AGATE_API_KEY = process.env.AGATE_API_KEY?.trim() || null;

/** Stub places for when Agate API is not configured (Chicago-area examples). */
const STUB_PLACES: Record<string, ResolvedItem> = {
  "pilsen-murals": {
    sourceId: "pilsen-murals",
    sourceLabel: "Agate",
    sourceUrl: "https://example.com/agate/pilsen-murals",
    type: "business",
    title: "18th Street Murals",
    description: "Mural corridor along 18th Street in Pilsen.",
    latitude: 41.856,
    longitude: -87.656,
    neighborhoodId: "Pilsen",
  },
  "millennium-park": {
    sourceId: "millennium-park",
    sourceLabel: "Agate",
    sourceUrl: "https://example.com/agate/millennium-park",
    type: "business",
    title: "Millennium Park",
    description: "Public park with Cloud Gate, Pritzker Pavilion, and Lurie Garden.",
    latitude: 41.8826,
    longitude: -87.6226,
    neighborhoodId: "Loop",
  },
  "art-institute": {
    sourceId: "art-institute",
    sourceLabel: "Agate",
    sourceUrl: "https://www.artic.edu",
    type: "business",
    title: "Art Institute of Chicago",
    description: "World-renowned art museum in the Loop.",
    latitude: 41.8796,
    longitude: -87.6237,
    neighborhoodId: "Loop",
  },
  "wrigley-field": {
    sourceId: "wrigley-field",
    sourceLabel: "Agate",
    sourceUrl: "https://www.mlb.com/cubs/ballpark",
    type: "business",
    title: "Wrigley Field",
    description: "Historic ballpark, home of the Chicago Cubs.",
    latitude: 41.9484,
    longitude: -87.6553,
    neighborhoodId: "Lake View",
  },
  "rogers-park-beach": {
    sourceId: "rogers-park-beach",
    sourceLabel: "Agate",
    type: "business",
    title: "Rogers Park Beaches",
    description: "Lakefront beaches in Rogers Park.",
    latitude: 41.994,
    longitude: -87.669,
    neighborhoodId: "Rogers Park",
  },
};

async function resolveFromApi(sourceId: string): Promise<ResolvedItem | null> {
  if (!AGATE_API_URL) return null;
  const url = new URL(`/place/${encodeURIComponent(sourceId)}`, AGATE_API_URL);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (AGATE_API_KEY) headers["Authorization"] = `Bearer ${AGATE_API_KEY}`;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  return {
    sourceId: String(data.id ?? sourceId),
    sourceLabel: "Agate",
    sourceUrl: data.url != null ? String(data.url) : undefined,
    type: "business",
    title: String(data.name ?? data.title ?? sourceId),
    description: data.description != null ? String(data.description) : undefined,
    latitude: typeof data.latitude === "number" ? data.latitude : undefined,
    longitude: typeof data.longitude === "number" ? data.longitude : undefined,
    neighborhoodId: data.neighborhoodId != null ? String(data.neighborhoodId) : null,
  };
}

export function getAgateAdapter(): DataSourceAdapter | null {
  const adapter: DataSourceAdapter = {
    sourceId: "agate",
    sourceLabel: "Agate",
    capabilities: ["supportsGeo", "supportsNeighborhoods", "searchable"],
    async resolveById(sourceId: string): Promise<ResolvedItem | null> {
      const fromApi = await resolveFromApi(sourceId);
      if (fromApi) return fromApi;
      return STUB_PLACES[sourceId] ?? null;
    },
    async search(query: string): Promise<ResolvedItem[]> {
      const q = query.toLowerCase().trim();
      const matches = Object.values(STUB_PLACES).filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.neighborhoodId?.toLowerCase().includes(q) ?? false)
      );
      return matches;
    },
  };
  return adapter;
}
