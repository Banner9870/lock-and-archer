/**
 * Unified feed: guides + articles (and optionally events) merged by date.
 * Used by citywide and community-area feeds.
 */

import {
  listRecentGuides,
  listGuidesByNeighborhoodId,
  listGuidesByAuthorDids,
  listRecentFeedArticles,
  listFeedArticlesByNeighborhoodId,
  getAccountHandle,
} from "@/lib/db/queries";
import { resolveDidToPdsUrl } from "@/lib/did-resolve";

export type FeedItemGuide = {
  type: "guide";
  sortAt: string;
  guide: {
    uri: string;
    authorDid: string;
    title: string;
    description: string;
    slug: string;
    updatedAt: string;
    handle: string | null;
  };
};

export type FeedItemArticle = {
  type: "article";
  sortAt: string;
  article: {
    url: string;
    sourceId: string;
    sourceLabel: string;
    title: string;
    description: string;
    publishedAt: string;
  };
};

export type FeedItem = FeedItemGuide | FeedItemArticle;

/** Build unified feed items for citywide (communityId = null) or community filter. */
export async function getUnifiedFeedItems(
  limit: number,
  communityId: string | null
): Promise<FeedItem[]> {
  const guideLimit = Math.ceil(limit * 0.6);
  const articleLimit = Math.ceil(limit * 0.6);

  const [guides, articles] = await Promise.all([
    communityId?.trim()
      ? listGuidesByNeighborhoodId(communityId.trim(), guideLimit)
      : listRecentGuides(guideLimit),
    listFeedArticlesByNeighborhoodId(communityId, articleLimit),
  ]);

  const guidesWithHandles = await Promise.all(
    guides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
    }))
  );

  const guideItems: FeedItemGuide[] = guidesWithHandles.map((g) => ({
    type: "guide",
    sortAt: g.updatedAt,
    guide: {
      uri: g.uri,
      authorDid: g.authorDid,
      title: g.title,
      description: g.description,
      slug: g.slug,
      updatedAt: g.updatedAt,
      handle: g.handle,
    },
  }));

  const articleItems: FeedItemArticle[] = articles.map((a) => ({
    type: "article",
    sortAt: a.publishedAt,
    article: {
      url: a.url,
      sourceId: a.sourceId,
      sourceLabel: a.sourceLabel,
      title: a.title,
      description: a.description,
      publishedAt: a.publishedAt,
    },
  }));

  const merged = [...guideItems, ...articleItems].sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime()
  );
  return merged.slice(0, limit);
}

/** Feed of guides from accounts the user follows (for /feeds/following). */
export async function getFollowingFeedItems(
  limit: number,
  followedDids: string[]
): Promise<FeedItem[]> {
  if (!followedDids.length) return [];
  const guideLimit = limit;
  const guides = await listGuidesByAuthorDids(followedDids, guideLimit);
  const guidesWithHandles = await Promise.all(
    guides.map(async (g) => ({
      ...g,
      handle: (await getAccountHandle(g.authorDid)) ?? g.authorDid,
    }))
  );
  return guidesWithHandles.map((g) => ({
    type: "guide" as const,
    sortAt: g.updatedAt,
    guide: {
      uri: g.uri,
      authorDid: g.authorDid,
      title: g.title,
      description: g.description,
      slug: g.slug,
      updatedAt: g.updatedAt,
      handle: g.handle,
    },
  }));
}

/** Resolve followed DIDs from the PDS (app.bsky.graph.getFollows) for the given actor. */
export async function getFollowedDids(actorDid: string): Promise<string[]> {
  const pdsBase = await resolveDidToPdsUrl(actorDid);
  if (!pdsBase) return [];
  const url = new URL("/xrpc/app.bsky.graph.getFollows", pdsBase);
  url.searchParams.set("actor", actorDid);
  url.searchParams.set("limit", "100");
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { follows?: { did?: string }[] };
  const follows = data.follows ?? [];
  return follows.map((f) => f.did).filter((d): d is string => typeof d === "string");
}

/** Following feed for a user: fetches follow list from PDS then guides from DB. */
export async function getFollowingFeedForUser(
  actorDid: string,
  limit: number
): Promise<FeedItem[]> {
  const followedDids = await getFollowedDids(actorDid);
  return getFollowingFeedItems(limit, followedDids);
}