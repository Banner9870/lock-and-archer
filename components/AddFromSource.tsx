"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResolvedItem = {
  sourceId: string;
  sourceLabel: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  type: "article" | "event" | "business";
  latitude?: number;
  longitude?: number;
  neighborhoodId?: string | null;
};

type SourceConfig = {
  id: string;
  label: string;
  searchPlaceholder: string;
  searchHint: string;
};

const SOURCES: Record<string, SourceConfig> = {
  agate: {
    id: "agate",
    label: "Agate",
    searchPlaceholder: "e.g. park, pilsen, beach",
    searchHint: "Chicago places (stub when API not configured).",
  },
  "chicago-events": {
    id: "chicago-events",
    label: "Chicago Public Library",
    searchPlaceholder: "e.g. book club, teens, origami",
    searchHint: "Library events from City of Chicago open data.",
  },
};

type Props = {
  guideSlugOrId: string;
  sourceId: keyof typeof SOURCES;
};

export function AddFromSource({ guideSlugOrId, sourceId }: Props) {
  const router = useRouter();
  const config = SOURCES[sourceId] ?? SOURCES.agate;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/data-sources/${config.id}/search?q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (item: ResolvedItem) => {
    setError(null);
    setAdding(item.sourceId);
    try {
      const res = await fetch(`/api/guides/${encodeURIComponent(guideSlugOrId)}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: item.sourceId,
          sourceLabel: item.sourceLabel,
          sourceUrl: item.sourceUrl,
          title: item.title,
          description: item.description,
          type: item.type,
          latitude: item.latitude,
          longitude: item.longitude,
          neighborhoodId: item.neighborhoodId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add item");
      setOpen(false);
      setQuery("");
      setItems([]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium border transition-opacity hover:opacity-90"
        style={{
          borderColor: "var(--border-color)",
          background: "var(--surface)",
          color: "var(--text-headline)",
        }}
      >
        {open ? "Cancel" : `Add from ${config.label}`}
      </button>

      {open && (
        <div
          className="mt-3 rounded-lg p-4 feed-card"
          style={{ border: "1px solid var(--border-color)" }}
        >
          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {config.searchHint}
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={config.searchPlaceholder}
              className="flex-1 rounded px-3 py-2 text-sm"
              style={{
                border: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                color: "var(--text-headline)",
              }}
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={loading}
              className="btn-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>
          {error && (
            <p className="text-sm mb-2" style={{ color: "var(--state-danger)" }}>
              {error}
            </p>
          )}
          {items.length > 0 && (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.sourceId}
                  className="flex items-center justify-between gap-3 rounded p-2"
                  style={{
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="font-medium truncate"
                      style={{ color: "var(--text-headline)" }}
                    >
                      {item.title}
                    </p>
                    {item.neighborhoodId && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Area {item.neighborhoodId}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => addItem(item)}
                    disabled={adding !== null}
                    className="btn-primary shrink-0 px-3 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    {adding === item.sourceId ? "Adding…" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && items.length === 0 && query && (
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              No results. Try another search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Convenience wrapper for Agate (backward compatible). */
export function AddFromAgate({ guideSlugOrId }: { guideSlugOrId: string }) {
  return <AddFromSource guideSlugOrId={guideSlugOrId} sourceId="agate" />;
}
