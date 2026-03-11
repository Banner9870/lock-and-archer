"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

type GuideItemWithGeo = {
  uri: string;
  guideUri: string;
  type: string;
  title: string;
  description: string;
  sourceLabel: string;
  latitude: number;
  longitude: number;
  neighborhoodId: string | null;
};

const GuidesMapClient = dynamic(
  () => import("@/components/GuidesMap").then((m) => m.GuidesMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[500px] animate-pulse rounded-lg"
        style={{ background: "var(--border-color)" }}
      />
    ),
  }
);

export default function GuidesMapPage() {
  const [items, setItems] = useState<GuideItemWithGeo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/guides/items-with-geo")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error("Failed to load"))
      )
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Error loading map data")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1
          className="font-heading text-2xl font-bold"
          style={{ color: "var(--text-headline)" }}
        >
          Guide map
        </h1>
        <Link href="/guides" className="text-sm hover:underline link-brand">
          Back to guides
        </Link>
      </div>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--text-secondary)" }}
      >
        All guide items with locations across every guide. Each guide also has its own map on its page.
      </p>
      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--state-danger)" }}>
          {error}
        </p>
      )}
      {loading ? (
        <div
          className="h-[500px] animate-pulse rounded-lg"
          style={{ background: "var(--border-color)" }}
        />
      ) : items.length === 0 ? (
        <div
          className="h-[400px] flex items-center justify-center rounded-lg feed-card"
          style={{ border: "1px solid var(--border-color)" }}
        >
          <p
            className="p-6 text-center"
            style={{ color: "var(--text-secondary)" }}
          >
            No items with locations yet. Seed guides with geo data or add locations when creating guides.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border-color)" }}
        >
          <GuidesMapClient items={items} />
        </div>
      )}
    </>
  );
}
