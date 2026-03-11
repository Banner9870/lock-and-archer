import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getAccountHandle } from "@/lib/db/queries";
import { LogoutButton } from "@/components/LogoutButton";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const handle = session
    ? (await getAccountHandle(session.did)) ?? session.did
    : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-secondary)" }}>
      <header
        className="sticky top-0 z-50 border-b w-full"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-heading font-bold text-lg shrink-0"
            style={{ color: "var(--text-headline)" }}
          >
            Lock & Archer
          </Link>

          <nav className="flex items-center gap-1 sm:gap-4">
            <Link
              href="/feeds"
              className="text-sm font-medium px-2 py-1.5 rounded-md hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              Feeds
            </Link>
            <Link
              href="/guides"
              className="text-sm font-medium px-2 py-1.5 rounded-md hover:opacity-80 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              Guides
            </Link>
            {session && (
              <Link
                href="/guides/new"
                className="btn-primary text-sm px-3 py-1.5 inline-flex items-center justify-center"
              >
                Create guide
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {session && handle ? (
              <>
                <span
                  className="text-sm truncate max-w-[120px] sm:max-w-[180px]"
                  style={{ color: "var(--text-secondary)" }}
                  title={handle}
                >
                  @{handle}
                </span>
                <LogoutButton />
              </>
            ) : (
              <Link
                href="/"
                className="text-sm font-medium link-brand"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
