# Phase 2 – Guides (core feature)

Guides are the main content type: curated collections of articles, events, and places. Phase 2 ships create, list, view, edit, add items, and fork, with the **home page showing recent guides** as the primary experience.

---

## What is a guide?

- A **guide** is a curated collection that can mix **articles**, **events**, **places/businesses** (and later other types).
- Each guide belongs to an **author DID** and is stored in that author’s **PDS** (not in a central server).
- Guides can be **forked**: anyone can make a copy in their own PDS; forks can be forked again.
- The app shows who authored a guide and **property badges** (Chicago Sun-Times, WBEZ, chicago.com) when the author’s DID is in the staff list for that property.

---

## Data model (high level)

- **Guide record** – Title, description, optional slug, optional `forkedFrom` (AT URI of the guide you forked), createdAt, updatedAt.
- **Guide item record** – One per item in a guide: parent guide ref, type (article / event / business / place), optional reference (sourceId, sourceUrl, sourceLabel), snapshot (title, description; later geo/neighborhood from Agate).

In Phase 2 we fill these manually in the UI; Phase 3 adds “Add from Agate” and other sources.

---

## Local index (app database)

The app keeps lightweight copies in SQLite so we can list and filter without hitting the PDS every time:

- **Guide table** – uri, authorDid, title, description, slug, forkedFrom, createdAt, updatedAt, indexedAt.
- **Guide item table** – uri, guideUri, authorDid, type, sourceId, sourceUrl, sourceLabel, title, description, snapshotAt, indexedAt; later latitude, longitude, neighborhoodId.

Writes go to the PDS and are **write-through** to the DB; Tap keeps the DB in sync when others create or update guides.

---

## User experience in Phase 2

### Home page

- **When not logged in** – Sign-in and “Create account” stay. The main content is a **“Recent guides”** list (most recent first): each row shows guide title, short description, author handle, and “X ago.” Clicking a row opens the guide detail page. Statuses are demoted to a secondary section or removed from the main view.
- **When logged in** – “Signed in as @handle” and Logout at the top. Primary content:
  - **“My guides”** – Guides you authored, most recent first (title, description snippet, item count, last updated). Prominent **“Create a guide”** button.
  - **“Recent guides”** – Same as above for discovery. Each row links to guide detail.

Empty state for “My guides”: “You haven’t created any guides yet. Start your first guide to collect articles, events, and places.” with a “Create your first guide” button.

### Guides section

- **List** – `/guides`: “My guides” and “Recent guides” (or tabs). Link each row to `/guides/[slugOrId]`.
- **Create** – `/guides/new`: form (title required, description optional, optional slug). Submit → create guide in PDS + write-through → redirect to guide detail.
- **Detail** – `/guides/[slugOrId]`: show guide title, description, author (with property badge(s) when applicable), list of items. Buttons: **“Add item”**, **“Fork this guide”** (when viewing someone else’s guide).
- **Add item** – On guide detail: type (article / event / business), title, description, optional URL. Save → create guideItem in PDS + write-through; item appears in the list.
- **Fork** – Creates a new guide in your PDS with `forkedFrom` set and copies all items; redirect to your new guide.

### Property badges

- The app reads config lists of staff DIDs per property: **Chicago Sun-Times** (`SUN_TIMES_STAFF_DIDS`), **WBEZ** (`WBEZ_STAFF_DIDS`), **chicago.com** (`CHICAGO_COM_STAFF_DIDS`) in env. When the guide author’s DID is in one or more of these lists, show the corresponding badge(s) next to the author on list and detail views (e.g. “Chicago Sun-Times”, “WBEZ”, “chicago.com”).

---

## How writes work

1. User acts in the UI (create guide, add item, edit, delete, fork).
2. API uses the user’s OAuth session to create/update/delete the guide or guideItem record in their PDS.
3. API immediately **write-through** to the app DB so the UI sees the change without waiting for Tap.
4. Tap later sends the same event; the webhook upserts so the DB stays consistent (e.g. if another client wrote the record).

For implementation details, API routes, and testing, see [phase-2-implementation.md](phase-2-implementation.md).
