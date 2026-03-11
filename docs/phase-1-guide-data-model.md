# Phase 1 Research: Guide Data Model & Architecture

**Status:** Draft  
**Last updated:** 2026-03-10  
**Context:** Built to Share — local guides co-creation (CPM + users). Guides contain a mix of articles, events, businesses; data from external APIs with hybrid reference + snapshot storage.

---

## 1. Decisions from discovery

| Topic | Decision |
|-------|----------|
| **Item mix** | A single guide can contain items of multiple types (articles, events, businesses, etc.) together. |
| **Data sources** | External APIs for places, events, etc. Specific sources to be supplied per type. |
| **Where guides live** | In the PDS of each author (by DID). CPM reporters have their own DIDs; their guides live in their repos. No separate “CPM repo.” |
| **Fork chain** | Any user can fork any guide → new guide in forker’s repo. Fork-of-fork is supported (reporter → user → user). |
| **Property badges** | App maintains config lists of staff DIDs per property (Chicago Sun-Times, WBEZ, chicago.com); guides authored by those DIDs display the corresponding property badge(s). |
| **Item storage** | Hybrid: store a **reference** (e.g. URL or external API ID) plus a **cached snapshot** (title, description, etc.) at add-to-guide time; refresh from source when needed for display or staleness. |

---

## 2. Guide record (atproto lexicon)

- **Proposed NSID:** `com.cpm.guides.guide` (or under CPM’s actual domain when chosen).
- **Location:** Stored in the author’s PDS (author = DID that created the guide).
- **Fields (conceptual):**
  - `title` (string, required)
  - `description` (string, optional)
  - `slug` (string, optional; for stable URLs; may be derived from title if not set)
  - `forkedFrom` (AT URI, optional) — the guide (or item) this was forked from
  - `createdAt` (datetime)
  - `updatedAt` (datetime)

Staff vs user is **not** a field on the record; it’s determined by whether the author’s DID is in the app’s staff DID lists for one or more properties (Sun-Times, WBEZ, chicago.com).

---

## 3. Guide items (articles, events, businesses, etc.)

Items are **mixed** in one guide and need a **hybrid** (reference + snapshot) model.

### 3.1 Option A: Single record type with discriminated union

One NSID, e.g. `com.cpm.guides.guideItem`, with:

- `guideRef` — AT URI of the parent guide (so we know which guide the item belongs to).
- `type` — `"article"` | `"event"` | `"business"` | extension for future types.
- **Reference:** `sourceId` or `sourceUrl` (string) — external API id or URL.
- **Snapshot:** `title`, `description`, optional type-specific fields (e.g. `location`, `startTime` for events; `address` for businesses) stored at add-to-guide time.
- `createdAt` / `updatedAt`.
- Optional `snapshotAt` (datetime) to support refresh logic.

**Pros:** One lexicon, one Tap subscription, simple to add new types.  
**Cons:** Lexicon schema is a bit more complex (union/discriminator).

### 3.2 Option B: Separate record types per kind

e.g. `com.cpm.guides.articleItem`, `com.cpm.guides.eventItem`, `com.cpm.guides.businessItem`. Each has `guideRef`, reference, snapshot fields.

**Pros:** Very clear schema per type.  
**Cons:** More lexicons, more webhook branches, more migrations.

**Recommendation:** Start with **Option A** (single `guideItem` with `type` and type-specific snapshot blob) unless we need strict schema per type for validation; we can refine once data sources are specified.

### 3.3 Snapshot shape (to refine with data sources)

- **Article:** `title`, `description` (or excerpt), `url`, optional `imageUrl`, `publishedAt`.
- **Event:** `title`, `description`, `startTime`, `endTime`, `location` (or `venue`), `url`, optional `imageUrl`.
- **Business / place:** `name`, `description`, `address`, optional `phone`, `url`, `imageUrl`, category.

All items share:

- `sourceId` / `sourceUrl` (reference)
- `snapshotAt` (when we last refreshed the snapshot)
- Optional `sourceLabel` (e.g. “CPM Events”, “Places API”) for display.

---

## 4. Fork and remix semantics

- **Fork:**
  - Create a new **guide** record in the forking user’s repo with `forkedFrom` = the source guide’s AT URI.
  - Create new **guideItem** records in the same repo for each item in the source guide. Each item can store the same reference (e.g. same event ID) and a copy of the snapshot at fork time, so the forked guide is self-contained and can be edited (e.g. reorder, remove items, add items).
  - Optionally store `forkedFromItem` on an item if we want to track item-level lineage; for MVP, guide-level `forkedFrom` may be enough.

- **Remix / “Inspired by”:**
  - Same as fork, or a lighter variant: new guide with `forkedFrom` set but fewer items copied (e.g. “start from this guide” with empty items). Can be the same implementation with different UI (e.g. “Fork” = copy all, “Use as template” = copy structure only).

- **Chain:** Reporter (DID A) → User (DID B) forks → User (DID C) forks B’s guide. Each guide points to its immediate parent via `forkedFrom`. We can traverse for “Inspired by” chain in UI if desired.

---

## 5. Where data lives

- **Authoritative content:** In the user’s PDS (guide + guideItem records). Writes go through OAuth Lex client (same pattern as Statusphere status).
- **App DB (Option B):** Tap webhook receives create/update/delete for `com.cpm.guides.guide` and `com.cpm.guides.guideItem`; app stores minimal index rows (e.g. guide table: `uri`, `authorDid`, `title`, `slug`, `forkedFrom`, `indexedAt`; item table: `uri`, `guideUri`, `authorDid`, `type`, `sourceId`, `title`, `snapshotAt`, `indexedAt`) for:
  - Feed / discovery (recent, featured, by topic/neighborhood later).
  - Resolving “current” snapshot for display (or refresh from external API when stale).
- **External APIs:** Used to resolve reference → snapshot when adding an item or when refreshing; data sources to be supplied per type (articles, events, businesses).

---

## 6. Property badges

- **Config:** Three env vars, e.g. `SUN_TIMES_STAFF_DIDS`, `WBEZ_STAFF_DIDS`, `CHICAGO_COM_STAFF_DIDS` (each comma- or newline-separated list of DIDs).
- **At read time:** When displaying a guide, if `authorDid` is in one or more of these lists, show the corresponding badge(s): “Chicago Sun-Times”, “WBEZ”, “chicago.com”. No change to lexicon or PDS.

---

## 7. Data sources (external APIs)

- **Articles:** Source TBD (you’ll provide); likely URL or CMS id → fetch title, excerpt, image, etc.
- **Events:** Source TBD; likely event id or URL → fetch title, times, venue, etc.
- **Businesses / places:** Source TBD; likely place id or URL → fetch name, address, etc.

**Next step:** You provide the specific data sources (and, if possible, example payloads or docs) for articles, events, and businesses so we can:
- Lock the reference format (id vs URL per type).
- Finalize snapshot fields per type.
- Design the “add to guide” and “refresh” flows.

---

## 8. Open questions

- **NSID domain:** Use `com.cpm.guides.*` or CPM’s actual domain (e.g. `org.chicagopublicmedia.guides.*`)? Depends on CPM’s atproto presence.
- **PDS support:** If guides are on a self-hosted PDS (e.g. lock-and-archer-pds), that PDS must accept the custom lexicon. We may need to register the lexicon (or use a PDS that allows custom records); confirm with PDS deployment.
- **Tap:** Tap must be configured to subscribe to repos that contain guide records; same pattern as Statusphere. If CPM reporters use the same PDS as the app’s users, one Tap can cover all; otherwise we may need multiple subscriptions or a relay.

---

## 9. Phase 2 readiness

Once we have:

1. Confirmation of NSID and Option A vs B for items,  
2. Data source details (and example shapes) for articles, events, businesses,  
3. Confirmation that the PDS(es) in use can store these lexicons,

we can move to **Phase 2:** implement the lexicons, migrations, CRUD API, Tap webhook, and basic UI (create guide, add mixed items, fork, share).
