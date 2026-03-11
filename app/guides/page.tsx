import { getSession } from "@/lib/auth/session";
import {
  listRecentGuides,
  listGuidesByAuthor,
  getAccountHandle,
} from "@/lib/db/queries";
import Link from "next/link";

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

export default async function GuidesPage() {
  const session = await getSession();
  const [recentGuides, myGuides] = await Promise.all([
    listRecentGuides(30),
    session ? listGuidesByAuthor(session.did, 50) : [],
  ]);

  const recentWithHandles = await Promise.all(
    recentGuides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
      href: guideHref(g),
    }))
  );
  const myWithHandles = await Promise.all(
    myGuides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
      href: guideHref(g),
    }))
  );

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1
          className="font-heading text-2xl font-bold"
          style={{ color: "var(--text-headline)" }}
        >
          Guides
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/guides/map"
            className="text-sm hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            All on map
          </Link>
          <Link
            href="/"
            className="text-sm hover:underline"
            style={{ color: "var(--text-secondary)" }}
          >
            Home
          </Link>
        </div>
      </div>

      {session && (
        <div className="mb-8">
          <Link
            href="/guides/new"
            className="btn-primary text-sm px-4 py-2 inline-flex"
          >
            Create a guide
          </Link>
        </div>
      )}

      {session && myWithHandles.length > 0 && (
        <div className="feed-card p-6 mb-8">
          <h2
            className="text-sm font-medium mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            My guides
          </h2>
          <ul className="space-y-4">
            {myWithHandles.map((g) => (
              <li key={g.uri}>
                <Link href={g.href} className="block group">
                  <span
                    className="font-medium group-hover:underline"
                    style={{ color: "var(--text-headline)" }}
                  >
                    {g.title}
                  </span>
                  <span
                    className="text-sm ml-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    @{g.handle}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {timeAgo(g.updatedAt)}
                  </span>
                  {g.description ? (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {g.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="feed-card p-6">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Recent guides
        </h2>
        {recentWithHandles.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No guides yet. Create one to get started.
          </p>
        ) : (
          <ul className="space-y-4">
            {recentWithHandles.map((g) => (
              <li key={g.uri}>
                <Link href={g.href} className="block group">
                  <span
                    className="font-medium group-hover:underline"
                    style={{ color: "var(--text-headline)" }}
                  >
                    {g.title}
                  </span>
                  <span
                    className="text-sm ml-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    @{g.handle}
                  </span>
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {timeAgo(g.updatedAt)}
                  </span>
                  {g.description ? (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {g.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
