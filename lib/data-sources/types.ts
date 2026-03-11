/**
 * Data-source types for Phase 3 (Agate and future sources).
 */

export type DataSourceType = "place" | "event" | "article";

export type DataSourceCapability = "supportsGeo" | "supportsNeighborhoods" | "searchable";

export interface DataSourceConfig {
  id: string;
  type: DataSourceType;
  baseUrl: string | null;
  apiKey: string | null;
  capabilities: DataSourceCapability[];
}

/** Resolved snapshot shape used when adding an item to a guide (and for refresh). */
export interface ResolvedItem {
  title: string;
  description?: string;
  sourceId: string;
  sourceUrl?: string;
  sourceLabel: string;
  type: "article" | "event" | "business";
  latitude?: number;
  longitude?: number;
  neighborhoodId?: string | null;
}

export interface DataSourceAdapter {
  readonly sourceId: string;
  readonly sourceLabel: string;
  readonly capabilities: DataSourceCapability[];
  /** Resolve a source id to snapshot for adding to a guide. Returns null if not found. */
  resolveById(sourceId: string): Promise<ResolvedItem | null>;
  /** Optional: search/browse. Returns list of sourceIds or resolved items for UI. */
  search?(query: string): Promise<ResolvedItem[]>;
}
