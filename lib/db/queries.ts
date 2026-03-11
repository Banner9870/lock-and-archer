import type { Transaction } from "kysely";
import { sql } from "kysely";
import { getTap } from "@/lib/tap";
import type { DatabaseSchema, AccountTable, StatusTable, GuideTable, GuideItemTable, FeedArticleTable } from "@/lib/db";
import { getDb } from "@/lib/db";
import { getHandle } from "@atproto/common-web";
import { AtUri } from "@atproto/syntax";
import { resolveDidToHandle } from "@/lib/did-resolve";

export async function getAccountStatus(did: string) {
  const db = getDb();
  const status = await db
    .selectFrom("status")
    .selectAll()
    .where("authorDid", "=", did)
    .where("current", "=", 1)
    .orderBy("createdAt", "desc")
    .limit(1)
    .executeTakeFirst();
  return status ?? null;
}

export async function insertStatus(data: StatusTable) {
  await getDb().transaction().execute(async (tx) => {
    await tx
      .insertInto("status")
      .values(data)
      .onConflict((oc) =>
        oc.column("uri").doUpdateSet({
          status: data.status,
          createdAt: data.createdAt,
          indexedAt: data.indexedAt,
          current: data.current,
        })
      )
      .execute();
    await setCurrStatus(tx, data.authorDid);
  });
}

export async function deleteStatus(uri: AtUri) {
  await getDb().transaction().execute(async (tx) => {
    await tx.deleteFrom("status").where("uri", "=", uri.toString()).execute();
    await setCurrStatus(tx, uri.hostname);
  });
}

export async function upsertAccount(data: AccountTable) {
  await getDb()
    .insertInto("account")
    .values(data)
    .onConflict((oc) =>
      oc.column("did").doUpdateSet({
        handle: data.handle,
        active: data.active,
      })
    )
    .execute();
}

export async function deleteAccount(did: string) {
  const db = getDb();
  await db.deleteFrom("account").where("did", "=", did).execute();
  await db.deleteFrom("status").where("authorDid", "=", did).execute();
}

async function setCurrStatus(tx: Transaction<DatabaseSchema>, did: string) {
  await tx
    .updateTable("status")
    .set({ current: 0 })
    .where("authorDid", "=", did)
    .where("current", "=", 1)
    .execute();
  const latest = await tx
    .selectFrom("status")
    .select("uri")
    .where("authorDid", "=", did)
    .orderBy("createdAt", "desc")
    .limit(1)
    .executeTakeFirst();
  if (latest) {
    await tx
      .updateTable("status")
      .set({ current: 1 })
      .where("uri", "=", latest.uri)
      .execute();
  }
}

export async function getAccountHandle(did: string): Promise<string | null> {
  const db = getDb();
  const account = await db
    .selectFrom("account")
    .select("handle")
    .where("did", "=", did)
    .executeTakeFirst();
  if (account) return account.handle;
  try {
    const didDoc = await getTap().resolveDid(did);
    if (didDoc) {
      const h = getHandle(didDoc);
      if (h) return h;
    }
  } catch {
    // Tap not configured or failed; try direct DID resolution
  }
  return resolveDidToHandle(did);
}

export async function getRecentStatuses(limit = 5) {
  const db = getDb();
  const rows = await db
    .selectFrom("status")
    .innerJoin("account", "status.authorDid", "account.did")
    .select([
      "status.uri",
      "status.authorDid",
      "status.status",
      "status.createdAt",
      "status.indexedAt",
      "status.current",
      "account.handle",
    ])
    .where("status.current", "=", 1)
    .orderBy("status.createdAt", "desc")
    .limit(limit)
    .execute();

  const result: typeof rows = [];
  for (const row of rows) {
    let handle = row.handle;
    if (handle.startsWith("did:")) {
      const resolved = await resolveDidToHandle(row.authorDid);
      if (resolved) {
        handle = resolved;
        await upsertAccount({
          did: row.authorDid,
          handle: resolved,
          active: 1,
        });
      }
    }
    result.push({ ...row, handle });
  }
  return result;
}

export async function getTopStatuses(limit = 10) {
  const db = getDb();
  const rows = await db
    .selectFrom("status")
    .select(["status.status", db.fn.count("status.uri").as("count")])
    .where("status.current", "=", 1)
    .groupBy("status.status")
    .orderBy("count", "desc")
    .limit(limit)
    .execute();
  return rows as { status: string; count: string }[];
}

export async function insertGuide(data: GuideTable) {
  await getDb()
    .insertInto("guide")
    .values(data)
    .onConflict((oc) =>
      oc.column("uri").doUpdateSet({
        authorDid: data.authorDid,
        title: data.title,
        description: data.description,
        slug: data.slug,
        forkedFrom: data.forkedFrom,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        indexedAt: data.indexedAt,
      })
    )
    .execute();
}

export async function getGuideByUri(uri: string) {
  const db = getDb();
  return db
    .selectFrom("guide")
    .selectAll()
    .where("uri", "=", uri)
    .executeTakeFirst()
    .then((row) => row ?? null);
}

export async function getGuideBySlug(slug: string) {
  const db = getDb();
  if (!slug.trim()) return null;
  return db
    .selectFrom("guide")
    .selectAll()
    .where("slug", "=", slug.trim())
    .executeTakeFirst()
    .then((row) => row ?? null);
}

/** Returns the guide for this author with the given slug, if any (for slug-based deduplication). */
export async function getGuideByAuthorAndSlug(authorDid: string, slug: string) {
  const db = getDb();
  if (!slug?.trim()) return null;
  return db
    .selectFrom("guide")
    .selectAll()
    .where("authorDid", "=", authorDid)
    .where("slug", "=", slug.trim())
    .executeTakeFirst()
    .then((row) => row ?? null);
}

export async function getGuideByRkey(rkey: string) {
  const db = getDb();
  if (!rkey.trim()) return null;
  const suffix = `/${rkey.trim()}`;
  return db
    .selectFrom("guide")
    .selectAll()
    .where("uri", "like", `%${suffix}`)
    .executeTakeFirst()
    .then((row) => row ?? null);
}

export async function listRecentGuides(limit = 20) {
  const db = getDb();
  return db
    .selectFrom("guide")
    .selectAll()
    .orderBy("indexedAt", "desc")
    .limit(limit)
    .execute();
}

export async function listGuidesByAuthor(authorDid: string, limit = 50) {
  const db = getDb();
  return db
    .selectFrom("guide")
    .selectAll()
    .where("authorDid", "=", authorDid)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .execute();
}

/** Guides by any of the given author DIDs (for following feed). */
export async function listGuidesByAuthorDids(
  authorDids: string[],
  limit = 50
) {
  const db = getDb();
  if (!authorDids.length) return [];
  return db
    .selectFrom("guide")
    .selectAll()
    .where("authorDid", "in", authorDids)
    .orderBy("indexedAt", "desc")
    .limit(limit)
    .execute();
}

export async function insertGuideItem(data: GuideItemTable) {
  await getDb()
    .insertInto("guide_item")
    .values(data)
    .onConflict((oc) =>
      oc.column("uri").doUpdateSet({
        guideUri: data.guideUri,
        authorDid: data.authorDid,
        type: data.type,
        sourceId: data.sourceId,
        sourceUrl: data.sourceUrl,
        sourceLabel: data.sourceLabel,
        title: data.title,
        description: data.description,
        snapshotAt: data.snapshotAt,
        indexedAt: data.indexedAt,
        latitude: data.latitude,
        longitude: data.longitude,
        neighborhoodId: data.neighborhoodId,
      })
    )
    .execute();
}

export async function listItemsByGuideUri(guideUri: string) {
  const db = getDb();
  return db
    .selectFrom("guide_item")
    .selectAll()
    .where("guideUri", "=", guideUri)
    .orderBy("indexedAt", "asc")
    .execute();
}

export async function deleteGuide(uri: string) {
  await getDb().deleteFrom("guide").where("uri", "=", uri).execute();
}

export async function deleteGuideItem(uri: string) {
  await getDb().deleteFrom("guide_item").where("uri", "=", uri).execute();
}

export async function deleteItemsByGuideUri(guideUri: string) {
  await getDb()
    .deleteFrom("guide_item")
    .where("guideUri", "=", guideUri)
    .execute();
}

/** All guide items that have latitude/longitude (for map view). */
export async function listItemsWithGeo(limit = 500) {
  const db = getDb();
  return db
    .selectFrom("guide_item")
    .selectAll()
    .where(sql`latitude IS NOT NULL`)
    .where(sql`longitude IS NOT NULL`)
    .orderBy("indexedAt", "desc")
    .limit(limit)
    .execute();
}

/** Guides that have at least one item in the given community area (for Phase 4 feeds). */
export async function listGuidesByNeighborhoodId(
  neighborhoodId: string,
  limit = 30
) {
  const db = getDb();
  if (!neighborhoodId.trim()) return [];
  const uris = await db
    .selectFrom("guide_item")
    .select("guideUri")
    .where("neighborhoodId", "=", neighborhoodId.trim())
    .distinct()
    .execute();
  const guideUris = uris.map((r) => r.guideUri);
  if (guideUris.length === 0) return [];
  return db
    .selectFrom("guide")
    .selectAll()
    .where("uri", "in", guideUris)
    .orderBy("indexedAt", "desc")
    .limit(limit)
    .execute();
}

// --- Feed articles (RSS ingest, e.g. Chicago Sun-Times) ---

export async function upsertFeedArticle(data: FeedArticleTable) {
  await getDb()
    .insertInto("feed_article")
    .values(data)
    .onConflict((oc) =>
      oc.column("url").doUpdateSet({
        sourceId: data.sourceId,
        sourceLabel: data.sourceLabel,
        title: data.title,
        description: data.description,
        publishedAt: data.publishedAt,
        fetchedAt: data.fetchedAt,
        neighborhoodId: data.neighborhoodId,
      })
    )
    .execute();
}

export async function listRecentFeedArticles(limit = 50) {
  const db = getDb();
  return db
    .selectFrom("feed_article")
    .selectAll()
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .execute();
}

/** Articles with optional neighborhood filter (for community feed). */
export async function listFeedArticlesByNeighborhoodId(
  neighborhoodId: string | null,
  limit = 50
) {
  const db = getDb();
  const query = db
    .selectFrom("feed_article")
    .selectAll()
    .orderBy("publishedAt", "desc")
    .limit(limit);
  if (neighborhoodId?.trim()) {
    return query.where("neighborhoodId", "=", neighborhoodId.trim()).execute();
  }
  return query.execute();
}
