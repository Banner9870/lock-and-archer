# Technical appendix

Reference for engineers: ATProto components, DB shapes, write/read paths, and feed implementation.

---

## A. ATProto components

- **PDS** – User accounts and records. Must accept custom guide lexicons; see [phase-2-implementation.md](phase-2-implementation.md).
- **Lexicons** – `com.cpm.guides.guide`, `com.cpm.guides.guideItem`. TypeScript under `src/lexicons/…`. Optional: `xyz.statusphere.status` when Statusphere is enabled.
- **Tap** – Subscribes to identity, status, and guide/guideItem; forwards to `/api/webhook`.
- **App DB (SQLite + Kysely)** – `auth_state`, `auth_session`, `account`, `status` (optional), `guide`, `guide_item`, `feed_article`.

---

## B. Guide table shapes

**Guide** – uri (PK), authorDid, title, description, slug, forkedFrom, createdAt, updatedAt, indexedAt.

**GuideItem** – uri (PK), guideUri, authorDid, type, sourceId, sourceUrl, sourceLabel, title, description, snapshotAt, indexedAt, latitude, longitude, neighborhoodId (all nullable for geo).

Timestamps stored as ISO strings in SQLite.

---

## C. Write path vs read path

- **Write** – API validates input and session → OAuth client create/put to PDS → write-through to DB (insert/update guide or guide_item) → return JSON.
- **Read** – Primarily from DB: list guides, get guide by URI/slug, list items by guideUri, listGuidesByAuthorDids (for Following feed). Fall back to PDS only when needed.

---

## D. Data-source adapters (Phase 3)

Each source implements:

- `resolveById(sourceId)` → `{ title, description, geo?, neighborhoodId? }`
- Optional: `search(q)` for search UI.

Agate and Chicago Socrata (CPL events) adapters are in `lib/data-sources/`. Used by “Add from Agate” and “Add from Chicago Public Library” and by the feed/neighborhoodId logic.

---

## E. Feeds (Phase 4)

- **Citywide** – `getUnifiedFeedItems(limit, null)`: recent guides + feed articles (e.g. Sun-Times), sorted by date. `GET /api/feeds/citywide`.
- **Community area** – `getUnifiedFeedItems(limit, communityId)`: guides with items in that neighborhood + articles tagged to that area. `GET /api/feeds/community/[communityId]`.
- **Following** – `getFollowedDids(actorDid)` calls PDS `app.bsky.graph.getFollows`; `getFollowingFeedItems(limit, followedDids)` uses `listGuidesByAuthorDids`. `GET /api/feeds/following` (auth required).

Implementation: `lib/feeds/unified.ts`; `lib/db/queries.ts` (`listRecentGuides`, `listGuidesByNeighborhoodId`, `listGuidesByAuthorDids`, `listRecentFeedArticles`, `listFeedArticlesByNeighborhoodId`).

---

## F. Phase 6 – Community-area onboarding (later)

- **Storage** – Extend `account` or add `user_preferences` (e.g. did, communityAreaId). Key by DID.
- **Boundaries** – City of Chicago community area boundaries; point-in-polygon (lat, lon) → community area. Align with Agate’s neighborhoodId.
- **Geocoding** – Address → coordinates → boundary lookup. Optional; store only community area for privacy.

Not implemented.

---

## Design standards

UI should follow [design-standards.md](design-standards.md): tokens, typography, mobile-first, accessibility.
