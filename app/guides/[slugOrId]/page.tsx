import {
  getGuideBySlug,
  getGuideByRkey,
  listItemsByGuideUri,
  getAccountHandle,
} from "@/lib/db/queries";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { GuideMapSection } from "@/components/GuideMapSection";
import { AddFromSource } from "@/components/AddFromSource";

type PageProps = { params: Promise<{ slugOrId: string }> };

type ItemWithGeo = {
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

export default async function GuideDetailPage({ params }: PageProps) {
  const { slugOrId } = await params;
  const guide =
    (await getGuideBySlug(slugOrId)) ?? (await getGuideByRkey(slugOrId));

  if (!guide) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="text-center">
          <h1
            className="font-heading text-xl font-bold mb-2"
            style={{ color: "var(--text-headline)" }}
          >
            Guide not found
          </h1>
          <Link href="/guides" className="link-brand hover:underline">
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
  const session = await getSession();
  const isOwner = session?.did === guide.authorDid;

  const itemsWithGeo: ItemWithGeo[] = items.filter(
    (i): i is ItemWithGeo =>
      i.latitude != null &&
      i.longitude != null &&
      typeof i.latitude === "number" &&
      typeof i.longitude === "number"
  );

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

      <div className="feed-card p-6 mb-6">
        <h1
          className="font-heading text-2xl font-bold mb-2"
          style={{ color: "var(--text-headline)" }}
        >
          {guide.title}
        </h1>
        <p
          className="text-sm mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          by @{authorHandle}
        </p>
        {guide.description ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {guide.description}
          </p>
        ) : null}
      </div>

      <GuideMapSection items={itemsWithGeo} className="mb-6" />

      {isOwner && (
        <div className="space-y-4 mb-6">
          <AddFromSource guideSlugOrId={slugOrId} sourceId="agate" />
          <AddFromSource guideSlugOrId={slugOrId} sourceId="chicago-events" />
        </div>
      )}

      <div className="feed-card p-6">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          Items
        </h2>
        {items.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No items yet. Add items in a future update.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.uri}
                className="pb-3 last:pb-0 border-b last:border-0"
                style={{ borderColor: "var(--border-color)" }}
              >
                <span
                  className="text-xs uppercase"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {item.type}
                </span>
                <p
                  className="font-medium"
                  style={{ color: "var(--text-headline)" }}
                >
                  {item.title || "(Untitled)"}
                </p>
                {item.description ? (
                  <p
                    className="text-sm mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
