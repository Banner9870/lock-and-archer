import { getGuideBySlug, getGuideByRkey, listItemsByGuideUri, getAccountHandle } from "@/lib/db/queries";
import Link from "next/link";

type PageProps = { params: Promise<{ slugOrId: string }> };

export default async function GuideDetailPage({ params }: PageProps) {
  const { slugOrId } = await params;
  const guide =
    (await getGuideBySlug(slugOrId)) ?? (await getGuideByRkey(slugOrId));

  if (!guide) {
    return (
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Guide not found
          </h1>
          <Link href="/guides" className="text-blue-600 dark:text-blue-400 hover:underline">
            Back to guides
          </Link>
        </div>
      </div>
    );
  }

  const [items, handle] = await Promise.all([
    listItemsByGuideUri(guide.uri),
    getAccountHandle(guide.authorDid),
  ]);
  const authorHandle = handle ?? guide.authorDid;

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="w-full max-w-2xl mx-auto p-8">
        <div className="mb-6">
          <Link
            href="/guides"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
          >
            ← Guides
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {guide.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            by @{authorHandle}
          </p>
          {guide.description ? (
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">
              {guide.description}
            </p>
          ) : null}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
            Items
          </h2>
          {items.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              No items yet. Add items in a future update.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.uri}
                  className="border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 uppercase">
                    {item.type}
                  </span>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.title || "(Untitled)"}
                  </p>
                  {item.description ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
