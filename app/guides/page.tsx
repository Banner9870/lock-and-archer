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
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-2xl mx-auto p-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Guides
          </h1>
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            Home
          </Link>
        </div>

        {session && (
          <div className="mb-8 flex items-center gap-3">
            <Link
              href="/guides/new"
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium"
            >
              Create a guide
            </Link>
          </div>
        )}

        {session && myWithHandles.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
              My guides
            </h2>
            <ul className="space-y-4">
              {myWithHandles.map((g) => (
                <li key={g.uri}>
                  <Link href={g.href} className="block group">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
                      {g.title}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-2">
                      @{g.handle}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">
                      {timeAgo(g.updatedAt)}
                    </span>
                    {g.description ? (
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 line-clamp-2">
                        {g.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
            Recent guides
          </h2>
          {recentWithHandles.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No guides yet. Create one to get started.
            </p>
          ) : (
            <ul className="space-y-4">
              {recentWithHandles.map((g) => (
                <li key={g.uri}>
                  <Link href={g.href} className="block group">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline">
                      {g.title}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-2">
                      @{g.handle}
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">
                      {timeAgo(g.updatedAt)}
                    </span>
                    {g.description ? (
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1 line-clamp-2">
                        {g.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
