import Link from "next/link";
import { COMMUNITY_AREAS } from "@/lib/community-areas";

export default function FeedsPage() {
  return (
    <>
      <div className="mb-6">
        <Link
          href="/guides"
          className="text-sm hover:underline link-brand"
        >
          ← Guides
        </Link>
      </div>
      <h1
        className="font-heading text-2xl font-bold mb-2"
        style={{ color: "var(--text-headline)" }}
      >
        Feeds
      </h1>
      <p
        className="text-sm mb-8"
        style={{ color: "var(--text-secondary)" }}
      >
        Your central feed of guides, articles, and events. Choose citywide or filter by community area.
      </p>

      <div className="feed-card p-6 mb-6">
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Citywide
        </h2>
        <Link
          href="/feeds/citywide"
          className="block font-medium hover:underline"
          style={{ color: "var(--text-headline)" }}
        >
          Citywide feed
        </Link>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          All guides and articles (e.g. Chicago Sun-Times), newest first
        </p>
      </div>

      <div className="feed-card p-6 mb-6">
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Following
        </h2>
        <Link
          href="/feeds/following"
          className="block font-medium hover:underline"
          style={{ color: "var(--text-headline)" }}
        >
          Following feed
        </Link>
        <p
          className="text-sm mt-0.5"
          style={{ color: "var(--text-secondary)" }}
        >
          Guides from people you follow (sign in required)
        </p>
      </div>

      <div className="feed-card p-6">
        <h2
          className="text-sm font-medium mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Filter by community area
        </h2>
        <p
          className="text-sm mb-3"
          style={{ color: "var(--text-secondary)" }}
        >
          Show only guides (and tagged articles) for a neighborhood.
        </p>
        <ul className="space-y-2">
          {COMMUNITY_AREAS.map((area) => (
            <li key={area.id}>
              <Link
                href={`/feeds/community/${encodeURIComponent(area.id)}`}
                className="font-medium hover:underline"
                style={{ color: "var(--text-headline)" }}
              >
                {area.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
