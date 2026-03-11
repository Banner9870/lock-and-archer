# Phase 2 – Implementation guide

This doc is for engineers: decisions, API surface, implementation checklist, and how to test.

---

## 1. Decisions (locked for Phase 2)

- **NSID** – `com.cpm.guides.guide` and `com.cpm.guides.guideItem`.
- **Rkey** – `tid` (timestamp-based) for both. Optional `slug` is stored inside the record for pretty URLs; resolve slug → guide in the API when loading by slug.
- **PDS** – PDS must accept these custom record types; allow-list if required (see RAILWAY_DEPLOY / PDS README).

---

## 2. API routes (current)

Authenticated routes use `getSession()`; return 401 when missing. After PDS write, **write-through** to the app DB.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/guides` | Create guide (title, description?, slug?). Write-through; return `{ uri, ... }`. |
| GET | `/api/guides` | List from DB: `recent` or by `authorDid`. |
| GET | `/api/guides/[slugOrRkey]` | Resolve slug or rkey to guide + items (from DB). |
| POST | `/api/guides/[slugOrRkey]/items` | Add item to guide (type, title, description?, sourceId?, sourceUrl?, sourceLabel?, geo?). Create guideItem on PDS + write-through. Owner only. Used by “Add from Agate” and “Add from Chicago Public Library.” |

**Not implemented:** PATCH guide, DELETE guide, DELETE guide item, POST /api/guides/fork.

---

## 3. Implementation checklist

- [x] Lexicons – `lexicons/com/cpm/guides/guide.json`, `guideItem.json`; codegen; `src/lexicons/com` barrel.
- [x] DB – Migration 003: `guide`, `guide_item`. Queries: insertGuide, getGuideByUri, getGuideBySlug, getGuideByRkey, listRecentGuides, listGuidesByAuthor, listGuidesByAuthorDids, insertGuideItem, listItemsByGuideUri, deleteGuide, deleteGuideItem, deleteItemsByGuideUri.
- [x] Webhook – Branch on `com.cpm.guides.guide` and `com.cpm.guides.guideItem`; upsert/delete in guide and guide_item.
- [x] API – POST guides, GET guides, GET guide by slug/rkey, POST guide items.
- [x] Config – `getStaffProperties(did)` in `lib/config.ts` (SUN_TIMES_STAFF_DIDS, WBEZ_STAFF_DIDS, CHICAGO_COM_STAFF_DIDS). Badges not yet shown in UI.
- [x] UI – Home: Recent guides, My guides (logged in), Create guide. `/guides` list, `/guides/new` create, `/guides/[slugOrId]` detail with Add from Agate / Add from Chicago Public Library (owner only).
- [ ] PATCH/DELETE guide, DELETE item, Fork – Documented; not implemented.
- [ ] Property badges in list/detail – Config exists; UI does not yet render badges.

---

## 4. Testing

1. Set `PDS_APP_URL` (and optionally run Tap with webhook at `/api/webhook`).
2. Create account or sign in.
3. Create a guide from home or `/guides/new`; confirm it appears in My guides and Recent guides and in the DB.
4. On guide detail, add an item via “Add from Agate” or “Add from Chicago Public Library”; confirm item appears and `guide_item` has a row.
5. Open `/guides/map`; confirm items with geo show as markers.

Write-through is enough for “Recent guides” and “My guides”; Tap is optional for indexing guides from other users.

---

## 5. ATProto references

- [Lexicons](https://atproto.com/guides/lexicon), [Lexicon spec](https://atproto.com/specs/lexicon)
- In this repo: `app/api/webhook/route.ts` (branch on collection, parse, upsert), `app/api/guides/route.ts`, `app/api/guides/[slugOrRkey]/items/route.ts`
