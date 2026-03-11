/**
 * Chicago Socrata adapter for dataset vsdy-d8k7 (Chicago Public Library events).
 * SODA API: https://data.cityofchicago.org/resource/vsdy-d8k7.json
 * Docs: https://dev.socrata.com/foundry/data.cityofchicago.org/vsdy-d8k7
 */

import type { DataSourceAdapter, ResolvedItem } from "./types";

const BASE_URL = "https://data.cityofchicago.org/resource/vsdy-d8k7.json";
const APP_TOKEN = process.env.SOCRATA_APP_TOKEN?.trim() || undefined;

/** Socrata row shape (subset we use). */
type SocrataEventRow = {
  event_id?: string;
  title?: string;
  description?: string;
  location_name?: string;
  location_address?: string;
  location?: { type: string; coordinates: [number, number] };
  start?: string;
  end?: string;
  event_page?: { url?: string };
  event_types?: string;
  ":@computed_region_rpca_8um6"?: string; // Community area number (1–77)
  [key: string]: unknown;
};

function rowToResolvedItem(row: SocrataEventRow): ResolvedItem | null {
  const eventId = row.event_id?.trim();
  const title = row.title?.trim();
  if (!eventId || !title) return null;

  const coords = row.location?.coordinates;
  const longitude = Array.isArray(coords) && coords.length >= 2 ? coords[0] : undefined;
  const latitude = Array.isArray(coords) && coords.length >= 2 ? coords[1] : undefined;

  const regionNum = row[":@computed_region_rpca_8um6"];
  const neighborhoodId =
    regionNum != null && String(regionNum).trim() !== ""
      ? String(regionNum).trim()
      : null;

  const descParts: string[] = [];
  if (row.description) descParts.push(row.description.replace(/\s+/g, " ").trim().slice(0, 500));
  if (row.location_name) descParts.push(`At ${row.location_name}.`);
  if (row.location_address) descParts.push(row.location_address);
  if (row.start) descParts.push(`Starts: ${row.start.slice(0, 10)}.`);
  const description = descParts.length > 0 ? descParts.join(" ") : undefined;

  const sourceUrl = row.event_page?.url;

  return {
    sourceId: eventId,
    sourceLabel: "Chicago Public Library",
    sourceUrl: sourceUrl || undefined,
    type: "event",
    title,
    description,
    latitude,
    longitude,
    neighborhoodId,
  };
}

async function fetchSocrata(params: Record<string, string>): Promise<SocrataEventRow[]> {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const headers: Record<string, string> = { Accept: "application/json" };
  if (APP_TOKEN) headers["X-App-Token"] = APP_TOKEN;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function getChicagoEventsAdapter(): DataSourceAdapter | null {
  return {
    sourceId: "chicago-events",
    sourceLabel: "Chicago Public Library",
    capabilities: ["supportsGeo", "supportsNeighborhoods", "searchable"],
    async resolveById(sourceId: string): Promise<ResolvedItem | null> {
      const rows = await fetchSocrata({
        $where: `event_id = '${sourceId.replace(/'/g, "''")}'`,
        $limit: "1",
      });
      const row = rows[0];
      return row ? rowToResolvedItem(row as SocrataEventRow) : null;
    },
    async search(query: string): Promise<ResolvedItem[]> {
      const q = query.trim().replace(/'/g, "''");
      const params: Record<string, string> = {
        $limit: "20",
        $order: "start DESC",
      };
      if (q) params.$q = q;
      const rows = await fetchSocrata(params);
      const items: ResolvedItem[] = [];
      for (const row of rows) {
        const item = rowToResolvedItem(row as SocrataEventRow);
        if (item) items.push(item);
      }
      return items;
    },
  };
}
