# Lock & Archer: Guides, Data Sources, and Feeds (Phase 2–5)

This document explains how Lock & Archer will use the **AT Protocol** to power guides, data sources (including Agate), and feeds—and how we’ll get there in phases 2–5. It’s written for both non-technical and technical readers.

---

## Executive Summary

Lock & Archer is an ATProto app for **community guides** and **local storytelling**.

Over the next phases we will:

- **Phase 2 – Guides:**  
  Store guides and guide items in each author’s PDS using ATProto lexicons, and mirror a lightweight index in the app database. Users can create, edit, and fork guides that mix articles, events, and places.

- **Phase 3 – Data sources & Agate:**  
  Introduce a pluggable “data source” layer so guides can pull structured content from external systems (starting with Agate for Chicago places and community areas). Guides will know which neighborhoods their items belong to, and can keep snapshots refreshed.

- **Phase 4 – Feeds & discovery:**  
  Build feeds that surface guides by community area and citywide. These feeds use the local index plus Agate metadata to show “what’s relevant where.”

- **Phase 5 – Custom feeds for power users:**  
  Provide a pattern and example code so technical users can write and deploy custom feeds against the same data, and (optionally) expose them as ATProto “custom feeds” that other clients can consume.

---

## 1. ATProto in Plain Language

ATProto is a protocol for social apps that can share data safely instead of locking it inside one company.

In our context:

- **Handles and DIDs**
  - A **handle** is a human-readable name like `alice.bsky.social` or `dave.lock-and-archer-pds.up.railway.app`.
  - A **DID** is a stable identifier like `did:plc:…`.
  - The handle points to the DID, and the DID points to where your data lives.

- **PDS (Personal Data Server)**
  - This is where your actual content lives: guides, guide items, statuses, etc.
  - A user can have their own PDS, or use a hosted one.
  - For Lock & Archer, we have our own PDS (`lock-and-archer-pds`) that can host accounts and guide data.

- **Apps**
  - An app (like Lock & Archer) is a **client**: it lets users sign in and reads/writes records to the user’s PDS. It does *not* “own” the records; the PDS does.

- **Lexicons**
  - Lexicons are machine-readable schemas that describe what a record looks like and what endpoints exist. We’ll define `com.cpm.guides.guide` and `com.cpm.guides.guideItem` for guides.

- **Tap (firehose subscriber)**
  - Tap connects to the ATProto firehose, sees relevant changes, and forwards them to our app via HTTP. Our `/api/webhook` updates a local database. That DB is an **index** for fast UIs and feeds; the PDS remains the source of truth.

- **OAuth**
  - Users sign in via OAuth; the app then writes records into their PDS on their behalf without seeing their password.

Put simply: **PDS** = where data lives. **Lexicons** = how data is structured. **Tap + webhook + DB** = how the app builds fast views and feeds. **OAuth + app** = how users interact with their data.

---

## 2. What Exists Today (Statusphere Pattern)

Today the app has:

- **OAuth login** – Users sign in with a handle; the app resolves it to a DID and completes OAuth.
- **Status posting (Statusphere)** – The app creates `xyz.statusphere.status` records in the user’s PDS and writes a copy into a local SQLite DB for “Recent” and “Top statuses.”
- **Tap + webhook** – Tap subscribes to identity and `xyz.statusphere.status` events and POSTs to `/api/webhook`; the webhook upserts into `account` and `status` tables.

We will reuse this **exact architecture** for guides and, later, for feeds.

---

## 3. Phase 2 – Guides (Core Feature)

### 3.1 What is a guide?

A **guide** is a curated collection that can mix articles, events, places/businesses, and later other types. Each guide belongs to an **author DID** and is stored in that author’s **PDS**. Guides can be **forked**: anyone can make a copy in their own PDS; forks can be forked again. The app shows author and a CPM badge when the author DID is in the CPM staff list.

### 3.2 Data model (high level)

We introduce two record types:

- **Guide** – Title, description, slug, `forkedFrom`, timestamps.
- **Guide item** – One per item in a guide: reference to parent guide, type (article/event/business/place), optional **reference** (sourceId, sourceUrl, sourceLabel), and **snapshot** (title, description; later geo/neighborhood from Agate).

In Phase 2 we mostly fill these manually; Phase 3 plugs in Agate and other sources.

### 3.3 Local index in the app database

The app keeps lightweight copies in a local DB:

- **Guide table** – uri, authorDid, title, description, slug, forkedFrom, createdAt, updatedAt, indexedAt.
- **Guide item table** – uri, guideUri, authorDid, type, source info, snapshot text, later geo/neighborhood fields.

This supports “all guides by this author,” “most recent guides,” and later discovery by neighborhood.

### 3.4 How writes work

For any write (create guide, add item, edit, delete): (1) User acts in the UI. (2) The API uses the user’s OAuth session to write the guide or guideItem record into their PDS and **write-through** to the DB. (3) Tap later sends the event; the webhook keeps the DB in sync. If another app writes guides into the user’s PDS, Tap picks those up too.

### 3.5 User experience in Phase 2

- **Create guide** – “Guides” → “New guide” → title and description → save → detail page.
- **Add items** – On guide detail, “Add item” → type (article/event/business) → title, description, optional URL → save.
- **Fork** – “Fork this guide” → new guide in your PDS with `forkedFrom` set; items copied into your PDS; you can edit independently.
- **CPM badge** – Config list of CPM staff DIDs; if author is in list, show “CPM / Chicago Public Media” badge.

---

## 4. Phase 3 – Data Sources and Agate (Geo & Neighborhoods)

Phase 3 adds **structured data sources**, especially **Agate** (places, neighborhoods/community areas in Chicago).

- **Data-source registry** – Each source has id, type, base URL, auth, capabilities (e.g. `supportsGeo`, `supportsNeighborhoods`). Driven by env or config.
- **Agate** – Config (e.g. `AGATE_API_URL`, `AGATE_API_KEY`). Guide items from Agate store `sourceId`, `sourceLabel: "Agate"`. When adding from Agate, the app calls the API, gets name, description, lat/lon, neighborhoodId, and stores them in the snapshot and DB.
- **UI** – “Add from Agate” lets users search/browse places or neighborhoods and add them to a guide with metadata filled automatically.
- **Refresh** – “Refresh from source” re-fetches the snapshot from the configured source and updates the record and DB.

Phase 3 is where guides become **geo-aware** and “know where they are” in Chicago.

---

## 5. Phase 4 – Feeds and Discovery (Community Areas & Citywide)

With guides and Agate in place, we build **feeds**:

- **Per community area** – For each Chicago community area, show guides that contain items in that area (using `neighborhoodId` on items). Route like `/community/[communityAreaSlug]`.
- **Citywide** – New or updated guides across all areas; optionally highlight CPM guides and remix activity.
- **Custom feeds (ATProto)** – A feed service can subscribe to the firehose, maintain a view, and expose feeds that other ATProto clients can subscribe to. Technical users can fork this service and add their own feed logic (e.g. “guides containing Agate places with category X”).

---

## 6. Phase 5 – Making Feeds Pluggable

Phase 5 makes feeds **first-class and pluggable**:

- Documented **feed definition pattern** (e.g. “write a function with this signature”).
- A `feeds/` directory or repo with community-area feed, citywide feed, CPM-only feed, and room for community-contributed feeds.
- The main app discovers which feeds exist and surfaces them; technical users can add or modify feeds with minimal friction.

---

## 7. Summary by Audience

**Non-technical**

- **Phase 2:** Guides are live; people create and remix guides; guides live with the author and can be discovered and forked.
- **Phase 3:** Guides integrate with Agate; items know neighborhoods and community areas.
- **Phase 4:** Feeds per community area and citywide so residents and staff see what’s relevant where.
- **Phase 5:** Technical contributors can write and deploy their own feeds.

**Technical**

- New lexicons: `com.cpm.guides.guide`, `com.cpm.guides.guideItem` in user PDSes.
- Local DB: `guide` and `guide_item` tables, mirroring PDS via Tap + webhook, write-through on writes.
- Data-source registry and adapters (Agate, etc.) that resolve `sourceId` → snapshot (including geo/neighborhood).
- Feeds: in-app feeds from DB queries; optional ATProto custom feed services for external clients and user-authored feed logic.

---

## 8. Design Standards

All UI work for guides, data sources, and feeds should follow **Chicago Local design standards**. Full details (tokens, Bootstrap/utility usage, typography, component patterns, full token JSON) are in:

- **[docs/design-standards.md](design-standards.md)**

Summary:

- **Never hardcode hex values**; use CSS variables (or design tokens) from `brand/tokens.json`.
- Use **brand red** (`#ed0000`) for primary actions and links; **Charter/serif** for headlines, **Source Sans Pro/sans** for body.
- **Mobile-first** layout; use the defined breakpoints and z-index scale.
- **Icon-only buttons** must have `aria-label`. See design-standards.md and `.cursor/rules/300-a11y.mdc` for accessibility.

---

## Technical Appendix

### A. ATProto components we use

- **PDS** – User accounts and records; must accept our custom guide lexicons.
- **Lexicons** – `xyz.statusphere.status` (existing); `com.cpm.guides.guide`, `com.cpm.guides.guideItem` (planned). TypeScript under `src/lexicons/…`.
- **Tap** – Subscribes to identity, status, and (later) guide/guideItem; forwards to `/api/webhook`.
- **App DB (SQLite + Kysely)** – Existing: `auth_state`, `auth_session`, `account`, `status`. Planned: `guide`, `guide_item`.

### B. Proposed guide table shapes (conceptual)

**Guide:** uri (PK), authorDid, title, description, slug, forkedFrom, createdAt, updatedAt, indexedAt.

**GuideItem:** uri (PK), guideUri, authorDid, type, sourceId, sourceUrl, sourceLabel, title, description, snapshotAt, indexedAt, latitude, longitude, neighborhoodId (Phase 3+).

### C. Write path vs read path

- **Write:** API validates and checks session → OAuth client create/put to PDS → write-through to DB → return JSON.
- **Read:** Primarily from DB (lists, joins, filters by author/time/neighborhood); fallback to PDS when needed.

### D. Data-source adapters (Phase 3)

Each source implements something like `resolveById(sourceId) → { title, description, geo/neighborhood… }`. Agate: `resolvePlaceOrArea(sourceId)` calling Agate API and mapping to our snapshot shape. Used by “Add from source” and “Refresh.”

### E. Feeds implementation notes

- **In-app:** Endpoints like `GET /api/feeds/citywide`, `GET /api/feeds/community/[communityAreaId]` query `guide` and `guide_item`, aggregate and sort.
- **Custom feed service:** Separate service subscribes to Tap, maintains index, exposes ATProto feed endpoints; can be extended by technical users.

---

## How to use this document

- Keep this file in the repo at **docs/phase-2-5-guides-data-sources-feeds.md**.
- Share the link with colleagues for review. For UI implementation, use [design-standards.md](design-standards.md) and `brand/tokens.json`.
