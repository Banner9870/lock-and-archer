import { getSession } from "@/lib/auth/session";
import {
  getAccountStatus,
  getRecentStatuses,
  getTopStatuses,
  getAccountHandle,
  listRecentGuides,
  listGuidesByAuthor,
} from "@/lib/db/queries";
import { isCreateAccountAvailable, isStatusphereEnabled } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { StatusPicker } from "@/components/StatusPicker";
import Link from "next/link";

type HomeProps = {
  searchParams: Promise<{ account_created?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const session = await getSession();
  const params = await searchParams;
  const accountCreated =
    params.account_created && String(params.account_created).trim()
      ? String(params.account_created).trim()
      : undefined;

  const [
    statuses,
    topStatuses,
    accountStatus,
    recentGuides,
    myGuides,
  ] = await Promise.all([
    getRecentStatuses(5),
    getTopStatuses(10),
    session ? getAccountStatus(session.did) : null,
    listRecentGuides(10),
    session ? listGuidesByAuthor(session.did, 20) : [],
  ]);

  const createAccountAvailable = isCreateAccountAvailable();
  const statusphereEnabled = isStatusphereEnabled();

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
    <>
      <div className="text-center mb-8">
        <h1
          className="font-heading text-3xl font-bold mb-2"
          style={{ color: "var(--text-headline)" }}
        >
          Lock & Archer
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Community guides, local storytelling, and your feed of articles and events
        </p>
      </div>

      {!session && (
        <div className="feed-card p-6 mb-6">
          {accountCreated && (
            <p
              className="mb-4 text-sm"
              style={{ color: "var(--state-success)" }}
            >
              Account created. Sign in with your new handle below.
            </p>
          )}
          <LoginForm defaultHandle={accountCreated} />
          {createAccountAvailable && (
            <p
              className="mt-4 text-center text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/create-account" className="link-brand">
                Create one
              </Link>
            </p>
          )}
        </div>
      )}

      {session && statusphereEnabled && (
        <div className="feed-card p-6 mb-6">
          <StatusPicker currentStatus={accountStatus?.status} />
        </div>
      )}

      {session && myGuidesWithHandles.length === 0 && (
        <div className="feed-card p-6 mb-6">
          <h3
            className="text-sm font-medium mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            My guides
          </h3>
          <p
            className="text-sm mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            You haven&apos;t created any guides yet. Start your first guide to collect articles, events, and places.
          </p>
          <Link
            href="/guides/new"
            className="btn-primary text-sm px-3 py-1.5 inline-flex"
          >
            Create your first guide
          </Link>
        </div>
      )}

      {session && myGuidesWithHandles.length > 0 && (
        <div className="feed-card p-6 mb-6">
          <h3
            className="text-sm font-medium mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            My guides
          </h3>
          <ul className="space-y-3">
            {myGuidesWithHandles.map((g) => (
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
                      className="text-sm mt-0.5 line-clamp-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {g.description}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/guides/new" className="mt-3 inline-block text-sm link-brand">
            Create a guide
          </Link>
        </div>
      )}

      <div className="feed-card p-6 mb-6">
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Recent guides
        </h3>
        {recentGuidesWithHandles.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No guides yet. Be the first to create one!
          </p>
        ) : (
          <ul className="space-y-3">
            {recentGuidesWithHandles.map((g) => (
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
                      className="text-sm mt-0.5 line-clamp-1"
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
        <Link href="/guides" className="mt-3 inline-block text-sm link-brand">
          All guides
        </Link>
      </div>

      {statusphereEnabled && topStatuses.length > 0 && (
        <div className="feed-card p-6 mb-6">
          <h3
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Top Statuses
          </h3>
          <div className="flex flex-wrap gap-2">
            {topStatuses.map((s) => (
              <span
                key={s.status}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                style={{
                  background: "var(--bg-secondary)",
                  color: "var(--text-headline)",
                }}
              >
                <span className="text-lg">{s.status}</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {String(s.count)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {statusphereEnabled && (
        <div className="feed-card p-6">
          <h3
            className="text-sm font-medium mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Recent statuses
          </h3>
          {statuses.length === 0 ? (
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              No statuses yet. Be the first!
            </p>
          ) : (
            <ul className="space-y-3">
              {statuses.map((s) => (
                <li key={s.uri} className="flex items-center gap-3">
                  <span
                    className="text-2xl"
                    style={{ color: "var(--text-headline)" }}
                  >
                    {s.status}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    @{s.handle}
                  </span>
                  <span
                    className="text-xs ml-auto"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {timeAgo(s.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
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
