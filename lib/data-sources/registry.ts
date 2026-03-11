/**
 * Registry of data sources (Phase 3). Sources are configured via env and adapters are loaded here.
 */

import type { DataSourceAdapter } from "./types";
import { getAgateAdapter } from "./agate";
import { getChicagoEventsAdapter } from "./chicago-socrata";

let _adapters: Map<string, DataSourceAdapter> | null = null;

function getAdapters(): Map<string, DataSourceAdapter> {
  if (_adapters != null) return _adapters;
  _adapters = new Map();
  const agate = getAgateAdapter();
  if (agate) _adapters.set(agate.sourceId, agate);
  const chicagoEvents = getChicagoEventsAdapter();
  if (chicagoEvents) _adapters.set(chicagoEvents.sourceId, chicagoEvents);
  return _adapters;
}

/** Get adapter by source id (e.g. "agate"). */
export function getDataSourceAdapter(sourceId: string): DataSourceAdapter | null {
  return getAdapters().get(sourceId) ?? null;
}

/** List all registered source ids. */
export function listDataSourceIds(): string[] {
  return Array.from(getAdapters().keys());
}
