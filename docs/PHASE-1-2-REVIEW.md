# Phase 1 & Phase 2 – Implementation Review

**Reviewed:** 2026-03-11  
**Scope:** Code vs [phase-1-guide-data-model.md](phase-1-guide-data-model.md), [phase-2-guides.md](phase-2-guides.md), [phase-2-implementation.md](phase-2-implementation.md).

---

## Phase 1 alignment

| Phase 1 decision | Status |
|------------------|--------|
| **Item mix** – Single guide can contain articles, events, businesses | ✅ Lexicon `guideItem` has `type`: article \| event \| business. |
| **Where guides live** – In each author’s PDS by DID | ✅ Writes go to PDS via OAuth; no central repo. |
| **Property badges** – Three properties (Sun-Times, WBEZ, chicago.com), config DID lists | ✅ `getStaffProperties(did)` in `lib/config.ts`; env: `SUN_TIMES_STAFF_DIDS`, `WBEZ_STAFF_DIDS`, `CHICAGO_COM_STAFF_DIDS`. Badges not yet rendered in UI (deferred). |
| **Option A** – Single `guideItem` record type with type discriminator | ✅ `com.cpm.guides.guideItem` with `guideRef`, `type`, reference/snapshot fields. |
| **Hybrid reference + snapshot** – sourceId/sourceUrl + title, description, snapshotAt | ✅ Lexicon and DB have sourceId, sourceUrl, sourceLabel, title, description, snapshotAt. |
| **Tap + app DB** – Webhook indexes guide/guide_item for discovery | ✅ Webhook branches on `com.cpm.guides.guide` and `com.cpm.guides.guideItem`; upsert/delete to `guide` and `guide_item`. |

---

## Phase 2 implementation status

### Done

- **Lexicons** – `lexicons/com/cpm/guides/guide.json` and `guideItem.json`; codegen; `src/lexicons/com` barrel.
- **DB** – Migration 003: `guide`, `guide_item`; migrations 004/005 for geo and feed_article. Queries include insertGuide, getGuideByUri, getGuideBySlug, getGuideByRkey, listRecentGuides, listGuidesByAuthor, listGuidesByAuthorDids, insertGuideItem, listItemsByGuideUri, deleteGuide, deleteGuideItem, deleteItemsByGuideUri.
- **Webhook** – Branches on collection; parse + upsert for guide/guideItem; delete guide cascades to items.
- **OAuth scope** – `repo:com.cpm.guides.guide` and `repo:com.cpm.guides.guideItem` in `lib/auth/client.ts`.
- **Config** – `getStaffProperties(did)` in `lib/config.ts`.
- **API** – POST `/api/guides` (create + write-through), GET `/api/guides` (recent or by authorDid), GET `/api/guides/[slugOrRkey]` (guide + items), POST `/api/guides/[slugOrRkey]/items` (add item; owner only).
- **UI** – Home: Recent guides primary; when logged in: My guides, Create guide, Recent guides. `/guides` list; `/guides/new` create; `/guides/[slugOrId]` detail with **Add from Agate** and **Add from Chicago Public Library** (owner only). Guide map at `/guides/map`; per-guide map on detail. Items list on detail.
- **Feeds** – Citywide, community area, **Following** (guides from people you follow); unified feed of guides + Sun-Times articles; `GET /api/feeds/following`, `/feeds/following`.
- **Blob proxy** – `GET /api/blob?did=&cid=`; `blobProxyUrl`, `resolveDidToPdsUrl`.
- **Deploy seed** – `pnpm railway-seed` for alice/bob/carol (profiles, avatars, follows, guides).

### Deferred

- **PATCH/DELETE guide** – Not implemented.
- **DELETE guide item** – Not implemented.
- **POST /api/guides/fork** – Fork guide + items (not implemented).
- **Property badges in UI** – `getStaffProperties` exists; list/detail do not show Chicago Sun-Times / WBEZ / chicago.com badges.

### PDS / Tap

- **PDS** – Must accept guide NSIDs; allow-list if required (see phase-2-implementation and RAILWAY_DEPLOY).
- **Tap** – For guides from other users to appear in Recent guides, run Tap with collection filters for the guide NSIDs and webhook at `/api/webhook`.

---

## Summary

The codebase matches Phase 1 data model and Phase 2 create/list/view/add-item flow, plus feeds (citywide, community, Following), blob proxy, and deploy-time seed. Fork, PATCH/DELETE guide, DELETE item, and property badge UI remain deferred.
