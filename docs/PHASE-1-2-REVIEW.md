# Phase 1 & Phase 2 – Implementation Review

**Reviewed:** 2026-03-11  
**Scope:** Code vs [phase-1-guide-data-model.md](docs/phase-1-guide-data-model.md), [phase-2-guides.md](docs/phase-2-guides.md), [phase-2-implementation.md](docs/phase-2-implementation.md).

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

- **Lexicons** – `lexicons/com/cpm/guides/guide.json` and `guideItem.json`; `lex build --override --import-ext ""`; `src/lexicons/com.ts` barrel; NSIDs in `lexicons.json`.
- **DB** – Migration 003: `guide`, `guide_item` tables and indexes; `GuideTable`/`GuideItemTable` in `lib/db/index.ts`; queries: insertGuide, getGuideByUri, getGuideBySlug, getGuideByRkey, listRecentGuides, listGuidesByAuthor, insertGuideItem, listItemsByGuideUri, deleteGuide, deleteGuideItem, deleteItemsByGuideUri.
- **Webhook** – `app/api/webhook/route.ts` branches on collection; parse + upsert for guide/guideItem; delete guide cascades to items.
- **OAuth scope** – `lib/auth/client.ts` includes `repo:com.cpm.guides.guide` and `repo:com.cpm.guides.guideItem`.
- **Config** – `getStaffProperties(did)` in `lib/config.ts`.
- **API** – POST `/api/guides` (create + write-through), GET `/api/guides` (recent or by authorDid), GET `/api/guides/[slugOrRkey]` (guide + items). Auth via getSession(); 401 when missing.
- **UI** – Home: Recent guides primary; when logged in: My guides (with empty state), Create a guide, Recent guides; statuses demoted. `/guides` list; `/guides/new` create form; `/guides/[slugOrId]` detail (title, description, author, items list). No “Add item” or “Fork” buttons yet.

### Deferred (next pass)

- **PATCH/DELETE guide** – Not implemented.
- **POST /api/guides/[guideId]/items** – Add item to guide (not implemented).
- **DELETE /api/guides/items/[itemUri]** – Not implemented.
- **POST /api/guides/fork** – Fork guide + items (not implemented).
- **Property badges in UI** – `getStaffProperties` exists; list/detail pages do not yet show Chicago Sun-Times / WBEZ / chicago.com badges next to author.

### PDS / Tap

- **PDS** – If createRecord fails for guide NSIDs, allow-list `com.cpm.guides.guide` and `com.cpm.guides.guideItem` on the PDS (see phase-2-implementation and RAILWAY_DEPLOY).
- **Tap** – For guides from other users to appear in Recent guides, run Tap with collection filters including these two NSIDs and webhook pointing at this app’s `/api/webhook`.

---

## Summary

The codebase matches Phase 1 data-model and Phase 2 “first slice”: create guide, list recent/my guides, view guide detail, write-through + webhook index. Add item, fork, PATCH/DELETE, and property badge UI are documented and left for the next iteration.
