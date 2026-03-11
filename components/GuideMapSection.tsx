"use client";

import dynamic from "next/dynamic";
import type { GuideItemWithGeo } from "@/components/GuidesMap";

const GuidesMapClient = dynamic(
  () => import("@/components/GuidesMap").then((m) => m.GuidesMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[280px] animate-pulse rounded-lg"
        style={{ background: "var(--border-color)" }}
      />
    ),
  }
);

type Props = {
  items: GuideItemWithGeo[];
  className?: string;
};

/** Renders a map for a single guide's items (only those with lat/lng). */
export function GuideMapSection({ items, className = "" }: Props) {
  if (items.length === 0) return null;

  return (
    <div className={className}>
      <h2
        className="text-sm font-medium mb-3"
        style={{ color: "var(--text-secondary)" }}
      >
        Map
      </h2>
      <div
        className="rounded-lg overflow-hidden h-[280px]"
        style={{ border: "1px solid var(--border-color)" }}
      >
        <GuidesMapClient items={items} height={280} />
      </div>
      <p
        className="text-xs mt-1.5"
        style={{ color: "var(--text-secondary)" }}
      >
        ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noopener noreferrer"
          className="underline link-brand"
        >
          OpenStreetMap
        </a>{" "}
        contributors
      </p>
    </div>
  );
}
