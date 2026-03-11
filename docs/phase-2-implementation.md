# Phase 2 – Implementation guide

This doc is for engineers: gaps we closed, decisions, API surface, lexicon pipeline, implementation checklist, and how to test.

---

## 1. Decisions (locked for Phase 2)

- **NSID** – Use `com.cpm.guides.guide` and `com.cpm.guides.guideItem`. Change only if CPM provides a different domain.
- **Rkey** – Use `tid` (timestamp-based) for both guide and guideItem, same pattern as `xyz.statusphere.status`. Optional `slug` is stored **inside** the record for pretty URLs; resolve slug → guide in the API when loading by slug.
- **PDS** – Before coding, **confirm** that the PDS (lock-and-archer-pds or your test PDS) accepts these custom record types. Some PDSes allow any NSID; others require allow-listing. If you get createRecord rejections, add the two NSIDs to the PDS config or docs (e.g. RAILWAY_DEPLOY or PDS README).

---

## 2. Gaps addressed

| Gap | Action |
|-----|--------|
| PDS acceptance | Pre-step: verify PDS accepts `com.cpm.guides.guide` and `com.cpm.guides.guideItem`; document if allow-list is required. |
| Lexicon pipeline | Source: JSON in `lexicons/com/cpm/guides/guide.json` and `guideItem.json`. Run same codegen used for status (add `lex build` script to package.json if missing). Export from `src/lexicons/com.ts`; add NSIDs to `lexicons.json` if the app uses it for resolution. |
| Home page | Home shows “Recent guides” (and “My guides” when logged in); statuses demoted or secondary. See [phase-2-guides.md](phase-2-guides.md). |
| API surface | See §3 below. |
| Testing | See §5 below. |
| Property badges | Add three DID lists in `lib/config.ts`: `SUN_TIMES_STAFF_DIDS`, `WBEZ_STAFF_DIDS`, `CHICAGO_COM_STAFF_DIDS` (each comma/newline-separated). Add `getStaffProperties(did): ('sun-times' | 'wbez' | 'chicago.com')[]` (or equivalent) and use in guide list and detail UI to show Chicago Sun-Times, WBEZ, or chicago.com badge(s). |

---

## 3. Phase 2 API routes

All authenticated routes use `getSession()`; return 401 when missing. After success PDS write, **write-through** to the app DB.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/guides` | Body: `{ title, description?, slug? }`. Create guide in PDS; write-through; return `{ uri, ... }`. |
| GET | `/api/guides` | Query: `recent`, `limit`, optional `authorDid`. List from DB (listRecentGuides / listGuidesByAuthor). |
| GET | `/api/guides/[slugOrRkey]` | Resolve slug or rkey to guide (from DB); join items. Return `{ guide, items }`. Alternatively support `?uri=...` with encoded AT URI. |
| PATCH | `/api/guides/[id]` | Verify session.did === guide.authorDid; update in PDS + write-through. |
| DELETE | `/api/guides/[id]` | Verify author; delete guide (and items) in PDS; delete from DB. |
| POST | `/api/guides/[guideId]/items` | Body: `{ type, title, description?, sourceUrl?, sourceId?, sourceLabel? }`. Create guideItem; write-through. |
| DELETE | `/api/guides/items/[itemUri]` | Verify item author or guide owner; delete in PDS + DB. |
| POST | `/api/guides/fork` | Body: `{ sourceGuideUri }`. Load source guide + items; create new guide with forkedFrom; create new items in forker’s PDS; write-through all. Return new guide URI. |

**URLs:** Prefer **slug** in paths when the guide has a slug (e.g. `/guides/my-first-guide`). Fall back to rkey or URI for uniqueness. Resolve slug → guide in the API (e.g. getGuideBySlug or getGuideByUri).

---

## 4. Implementation checklist

Use this order; each step unblocks the next.

1. **Confirm PDS** – Verify PDS accepts the two guide NSIDs; document if allow-list is needed.
2. **Lexicons** – Add `lexicons/com/cpm/guides/guide.json` and `guideItem.json` (see [Lexicon spec](https://atproto.com/specs/lexicon)); run Lex codegen; add `src/lexicons/com.ts` barrel; update `lexicons.json` if used.
3. **DB** – Migration 003: create `guide` and `guide_item` tables (see [technical-appendix.md](technical-appendix.md)). Add types to `lib/db/index.ts`; implement queries in `lib/db/queries.ts` (insertGuide, getGuideByUri, getGuideBySlug, listRecentGuides, listGuidesByAuthor, insertGuideItem, listItemsByGuideUri, updateGuide, deleteGuide, deleteGuideItem, deleteItemsByGuideUri).
4. **Webhook** – In `app/api/webhook/route.ts`, branch on `evt.collection`: for `com.cpm.guides.guide` and `com.cpm.guides.guideItem`, parse with new lexicons and upsert/delete in `guide` and `guide_item`.
5. **API routes** – Implement the routes in §3; auth via getSession(); write-through after each PDS create/put/delete.
6. **Config** – Add `getStaffProperties(did)` in `lib/config.ts` (three env vars: `SUN_TIMES_STAFF_DIDS`, `WBEZ_STAFF_DIDS`, `CHICAGO_COM_STAFF_DIDS`); use in UI to show the appropriate property badge(s) (Chicago Sun-Times, WBEZ, chicago.com).
7. **UI – Home** – Replace or demote “Recent statuses” with “Recent guides”; when logged in add “My guides” and “Create guide.” Link rows to guide detail.
8. **UI – Guides** – Pages: `/guides` (list), `/guides/new` (create), `/guides/[slugOrId]` (detail with “Add item” and “Fork”). Wire to API.
9. **Testing** – Run through the flow in §5; confirm DB and (if Tap used) webhook.

---

## 5. Testing Phase 2

1. **Setup** – Run the app with `PDS_APP_URL` pointing at your PDS. Optionally run Tap with webhook URL pointing at your app’s `/api/webhook`.
2. **Create account** – Use the app’s “Create account” flow (or an existing account on the PDS).
3. **Sign in** – Complete OAuth with your handle.
4. **Create a guide** – From home or `/guides/new`, submit title and description. Confirm redirect to guide detail and that the guide appears in “My guides” and “Recent guides.”
5. **Check DB** – Inspect the app DB: `guide` table should have a row for the new guide; write-through should have run without waiting for Tap.
6. **Add an item** – On the guide detail page, add an item (type, title, description). Confirm it appears in the list and that `guide_item` has a row.
7. **Fork** – Open another user’s guide (or a second guide from the same account) and click “Fork.” Confirm a new guide is created in your repo and you are redirected to it; items should be copied.
8. **Tap (optional)** – If Tap is running, confirm webhook receives create/update events for the guide collections and that the DB stays consistent (e.g. re-send event → idempotent upsert).

Testing without Tap is fine for initial development; write-through alone is enough for “Recent guides” and “My guides.”

---

## 6. ATProto references

- [Lexicons](https://atproto.com/guides/lexicon) – Schema format, record types, NSID.
- [Lexicon spec](https://atproto.com/specs/lexicon) – Record definition (`record`, `key`, `required`, `properties`, `format: "datetime"`).
- [Publishing Lexicons](https://atproto.com/guides/publishing-lexicons) – `goat lex new record`, `goat lex publish` (for publishing; local dev can use JSON + codegen).
- In this repo: `lexicons/xyz/statusphere/status.json`, `app/api/status/route.ts` (create + write-through), `app/api/webhook/route.ts` (branch on collection, parse, upsert).
