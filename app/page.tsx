import { getSession } from "@/lib/auth/session";
import {
  getAccountStatus,
  getRecentStatuses,
  getTopStatuses,
  getAccountHandle,
  listRecentGuides,
  listGuidesByAuthor,
} from "@/lib/db/queries";
import { isCreateAccountAvailable } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { LogoutButton } from "@/components/LogoutButton";
import { StatusPicker } from "@/components/StatusPicker";
import Link from "next/link";

type HomeProps = {
  searchParams: Promise<{ account_created?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await getSession();
  const params = await searchParams;
  const accountCreated = params.account_created && String(params.account_created).trim() ? String(params.account_created).trim() : undefined;

  const [
    statuses,
    topStatuses,
    accountStatus,
    accountHandle,
    recentGuides,
    myGuides,
  ] = await Promise.all([
    getRecentStatuses(5),
    getTopStatuses(10),
    session ? getAccountStatus(session.did) : null,
    session ? getAccountHandle(session.did) : null,
    listRecentGuides(10),
    session ? listGuidesByAuthor(session.did, 20) : [],
  ]);

  const createAccountAvailable = isCreateAccountAvailable();

  const recentGuidesWithHandles = await Promise.all(
    recentGuides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
      href: guideHref(g),
    }))
  );
  const myGuidesWithHandles = await Promise.all(
    myGuides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
      href: guideHref(g),
    }))
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-md mx-auto p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Lock & Archer
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Community guides and local storytelling
          </p>
        </div>

        {session ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Signed in as @{accountHandle ?? session.did}
              </p>
              <LogoutButton />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/guides"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Guides
              </Link>
              <Link
                href="/guides/new"
                className="inline-flex items-center justify-center rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 text-sm font-medium"
              >
                Create a guide
              </Link>
            </div>
            <StatusPicker currentStatus={accountStatus?.status} />
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            {accountCreated && (
              <p className="mb-4 text-sm text-green-600 dark:text-green-400">
                Account created. Sign in with your new handle below.
              </p>
            )}
            <LoginForm defaultHandle={accountCreated} />
            {createAccountAvailable && (
              <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Don&apos;t have an account?{" "}
                <Link href="/create-account" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Create one
                </Link>
              </p>
            )}
          </div>
        )}

        {session && myGuidesWithHandles.length === 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              My guides
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3">
              You haven&apos;t created any guides yet. Start your first guide to collect articles, events, and places.
            </p>
            <Link
              href="/guides/new"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Create your first guide
            </Link>
          </div>
        )}

        {session && myGuidesWithHandles.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              My guides
            </h3>
            <ul className="space-y-3">
              {myGuidesWithHandles.map((g) => (
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
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 line-clamp-1">
                        {g.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/guides/new"
              className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create a guide
            </Link>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            Recent guides
          </h3>
          {recentGuidesWithHandles.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No guides yet. Be the first to create one!
            </p>
          ) : (
            <ul className="space-y-3">
              {recentGuidesWithHandles.map((g) => (
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
                      <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-0.5 line-clamp-1">
                        {g.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/guides"
            className="mt-3 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            All guides
          </Link>
        </div>

        {topStatuses.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Top Statuses
            </h3>
            <div className="flex flex-wrap gap-2">
              {topStatuses.map((s) => (
                <span
                  key={s.status}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm"
                >
                  <span className="text-lg">{s.status}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {String(s.count)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            Recent statuses
          </h3>
          {statuses.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No statuses yet. Be the first!
            </p>
          ) : (
            <ul className="space-y-3">
              {statuses.map((s) => (
                <li key={s.uri} className="flex items-center gap-3">
                  <span className="text-2xl">{s.status}</span>
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                    @{s.handle}
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-auto">
                    {timeAgo(s.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

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
