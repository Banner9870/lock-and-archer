import Link from "next/link";
import { getUnifiedFeedItems } from "@/lib/feeds/unified";
import type { FeedItem } from "@/lib/feeds/unified";

function guideHref(guide: { slug: string; uri: string }): string {
  const segment = guide.slug?.trim() || guide.uri.split("/").pop() || "";
  return `/guides/${encodeURIComponent(segment)}`;
}

function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default async function CitywideFeedPage() {
  const items = await getUnifiedFeedItems(30, null);

  return (
    <>
      <div className="mb-6">
        <Link href="/feeds" className="text-sm hover:underline link-brand">
          ← Feeds
        </Link>
      </div>
      <h1
        className="font-heading text-2xl font-bold mb-2"
        style={{ color: "var(--text-headline)" }}
      >
        Citywide
      </h1>
      <p
        className="text-sm mb-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Guides and articles from everyone and Chicago Sun-Times, newest first
      </p>

      {items.length === 0 ? (
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          No guides or articles yet. Run the Sun-Times ingest to pull in articles.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <FeedItemRow
              key={item.type === "guide" ? item.guide.uri : item.article.url}
              item={item}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function FeedItemRow({ item }: { item: FeedItem }) {
  if (item.type === "guide") {
    const { guide } = item;
    const href = guideHref(guide);
    return (
      <li>
        <Link href={href} className="feed-card block p-4 transition-shadow hover:shadow-card-hover">
          <span
            className="text-xs font-medium uppercase"
            style={{ color: "var(--text-secondary)" }}
          >
            Guide
          </span>
          <span
            className="font-medium block mt-0.5 group-hover:underline"
            style={{ color: "var(--text-headline)" }}
          >
            {guide.title}
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            @{guide.handle ?? guide.authorDid}
          </span>
          <span
            className="text-xs ml-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {timeAgo(guide.updatedAt)}
          </span>
          {guide.description ? (
            <p
              className="text-sm mt-1 line-clamp-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {guide.description}
            </p>
          ) : null}
        </Link>
      </li>
    );
  }

  const { article } = item;
  return (
    <li>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="feed-card block p-4 transition-shadow hover:shadow-card-hover"
      >
        <span
          className="text-xs font-medium uppercase"
          style={{ color: "var(--text-secondary)" }}
        >
          Article · {article.sourceLabel}
        </span>
        <span
          className="font-medium block mt-0.5 hover:underline"
          style={{ color: "var(--text-headline)" }}
        >
          {article.title}
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          {timeAgo(article.publishedAt)}
        </span>
        {article.description ? (
          <p
            className="text-sm mt-1 line-clamp-2"
            style={{ color: "var(--text-secondary)" }}
          >
            {article.description}
          </p>
        ) : null}
      </a>
    </li>
  );
}
