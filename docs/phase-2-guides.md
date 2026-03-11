# Phase 2 – Guides (core feature)

Guides are the main content type: curated collections of articles, events, and places. Phase 2 ships create, list, view, and **add items** (from data sources). The **home page shows recent guides** as the primary experience.

---

## What is a guide?

- A **guide** is a curated collection that can mix **articles**, **events**, **places/businesses** (and later other types).
- Each guide belongs to an **author DID** and is stored in that author’s **PDS** (not in a central server).
- Guides can be **forked** (copy into your repo); fork is documented but **not yet implemented** in API or UI.
- The app can show **property badges** (Chicago Sun-Times, WBEZ, chicago.com) when the author’s DID is in the staff list; config exists, **badges not yet shown in UI**.

---

## Data model (high level)

- **Guide record** – Title, description, optional slug, optional `forkedFrom` (AT URI), createdAt, updatedAt.
- **Guide item record** – Parent guide ref, type (article / event / business), reference (sourceId, sourceUrl, sourceLabel), snapshot (title, description, optional geo/neighborhoodId).

The app keeps lightweight copies in SQLite (write-through from PDS; Tap keeps index in sync when others create or update).

---

## User experience (current)

### Home page

- **When not logged in** – Sign-in and “Create account.” Main content: **Recent guides** (title, description snippet, author handle, time). Each row links to guide detail. Statuses are secondary or hidden (gated by `ENABLE_STATUSPHERE`).
- **When logged in** – “My guides,” **Create a guide**, Recent guides. Empty state for My guides with “Create your first guide.”

### Guides section

- **List** – `/guides`: My guides and Recent guides; link each row to `/guides/[slugOrId]`.
- **Create** – `/guides/new`: title (required), description and slug optional. Submit → create on PDS + write-through → redirect to guide detail.
- **Detail** – `/guides/[slugOrId]`: title, description, author, **map** (if items have geo), **Add from Agate** and **Add from Chicago Public Library** (owner only), then list of items. No “Fork” button yet.

### Add item

- **Add from Agate** – Search/browse Agate places or neighborhoods; add one to the guide (title, description, geo filled from Agate). Owner only.
- **Add from Chicago Public Library** – Search CPL events; add one to the guide. Owner only.

Add item creates a guideItem on the PDS and write-through to the app DB; item appears in the list. Manual “add item” (type + title + description only) is not exposed in the current UI; data sources are the primary path.

### Property badges

- Config: `SUN_TIMES_STAFF_DIDS`, `WBEZ_STAFF_DIDS`, `CHICAGO_COM_STAFF_DIDS`. `getStaffProperties(did)` returns which badges apply. **Not yet rendered** on list or detail.

---

## How writes work

1. User acts in the UI (create guide, add item from Agate/CPL).
2. API uses the user’s OAuth session to create the guide or guideItem record in their PDS.
3. API **write-through** to the app DB so the UI sees the change without waiting for Tap.
4. Tap (if running) sends the same event; webhook upserts so the DB stays consistent.

For API details and testing, see [phase-2-implementation.md](phase-2-implementation.md).
