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
  - A **handle** is a human‑readable name like `alice.bsky.social` or `dave.lock-and-archer-pds.up.railway.app`.
  - A **DID** is a stable identifier like `did:plc:…`.
  - The handle points to the DID, and the DID points to where your data lives.

- **PDS (Personal Data Server)**
  - This is where your actual content lives: guides, guide items, statuses, etc.
  - A user can have their own PDS, or use a hosted one.
  - For Lock & Archer, we have our own PDS (`lock-and-archer-pds`) that can host accounts and guide data.

- **Apps**
  - An app (like Lock & Archer) is a **client**:
    - It lets users sign in.
    - It reads and writes records to the user’s PDS.
  - It does *not* “own” the records; the PDS does.

- **Lexicons**
  - Lexicons are machine‑readable schemas that describe:
    - What a record looks like (fields, types).
    - What endpoints exist (procedures like “createAccount”).
  - For example:
    - `xyz.statusphere.status` describes a status update.
    - We’ll define `com.cpm.guides.guide` and `com.cpm.guides.guideItem` for guides.

- **Tap (firehose subscriber)**
  - Tap connects to the ATProto **firehose**, sees all relevant changes, and forwards them to our app via HTTP.
  - Our app has a `/api/webhook` endpoint that receives these events and updates a local database.
  - This local DB is just an **index** to make UIs and feeds fast; the PDS remains the source of truth.

- **OAuth**
  - When a user signs in, we use an OAuth flow.
  - The user grants the app permission to act as them (for certain scopes) without sharing their raw password.
  - The app then uses this session to write records into their PDS on their behalf.

Put simply:

> **PDS**: where your data lives.  
> **Lexicons**: how data is structured.  
> **Tap + webhook + DB**: how the app builds fast views and feeds.  
> **OAuth + app**: how users interact with their data.

---

## 2. What Exists Today (Statusphere Pattern)

Today, the Lock & Archer app already has:

- **OAuth login:**  
  Users sign in with a handle; the app resolves it to a DID and completes an OAuth flow.

- **Status posting (Statusphere example):**
  - The app can create `xyz.statusphere.status` records in the user’s PDS.
  - It also writes a copy of those records into a local SQLite DB (`status` table).
  - This supports “Recent” and “Top statuses” views without hammering the PDS.

- **Tap + webhook:**
  - A Tap instance subscribes to the firehose and filters for:
    - Identity changes.
    - `xyz.statusphere.status` records.
  - It POSTs events to `/api/webhook` in the app.
  - The webhook parses events and upserts into the DB (`account` and `status` tables).

We will reuse this **exact architecture** for guides and, eventually, for feeds.

---

## 3. Phase 2 – Guides (Core Feature)

### 3.1 What is a guide?

A **guide** is a curated collection that can mix:

- Articles
- Events
- Places / businesses
- Later: other resource types

Properties:

- Each guide belongs to an **author DID** and is stored in that author’s **PDS**.
- A guide can be **forked**:
  - Anyone can make their own copy (in their own PDS).
  - Forks can themselves be forked, forming a chain of derivatives.
- The app will show who authored a guide, and whether that DID is in a CPM staff list (for the CPM badge).

### 3.2 Data model (high level, non‑technical)

We introduce two record types:

- **Guide**
  - Fields like:
    - Title
    - Description
    - Slug (optional URL‑friendly ID)
    - `forkedFrom` (points to the guide you started from)
    - Timestamps (created/updated)

- **Guide item**
  - One record per item in a guide.
  - Fields like:
    - Reference to its parent guide.
    - Type (article, event, business, later place).
    - **Reference** to an upstream data source (optional):
      - Source ID
      - Source URL
      - Source label (“Agate”, “CPM Events”, etc.).
    - **Snapshot**:
      - Title to display.
      - Short description.
      - Later: geo and neighborhood info from Agate.

In Phase 2 we will mostly fill these fields manually (typed in by users). Phase 3 will plug in Agate and other sources.

### 3.3 Local index in the app database

For fast discovery, the app maintains **lightweight copies** of guides and items in a local DB:

- **Guide table** (one row per guide):
  - Who authored it (`authorDid`).
  - Basic text fields (title, description, slug).
  - Fork relationship.
  - When it was created/updated and indexed.

- **Guide item table** (one row per item):
  - Which guide it belongs to.
  - Author DID.
  - Type.
  - Source info (ID, URL, label).
  - Snapshot text (title, description).
  - Later: geo/neighborhood fields for discovery.

This makes it easy to answer questions like:

- “Show me all guides created by this reporter.”
- “Show the most recent guides.”

The real content still lives in the **PDS**; the DB is an **index** and cache.

### 3.4 How writes work in Phase 2

For any write (create guide, add item, edit, delete):

1. The user does something in the UI.
2. The app’s API:
   - Uses the user’s OAuth session to write a **guide** or **guide item** record into their PDS.
   - Immediately writes a corresponding row into the DB (this is called “write‑through”).
3. Later, Tap sends the same event back through the firehose, and the webhook ensures the DB stays in sync.

If another ATProto‑aware tool writes guides into the user’s PDS, Tap will pick those up too and they’ll appear in the app.

### 3.5 User experience in Phase 2

In Phase 2, guides are **manual but flexible**:

- **Creating a guide**
  - Click “Guides” → “New guide”.
  - Fill in title and description.
  - After saving, you’re taken to the guide’s detail page.

- **Adding items**
  - On the guide detail page, click “Add item”.
  - Choose a type (article, event, business).
  - Paste title, description, and (optionally) a URL.
  - Save; the item appears in the list.

- **Forking a guide**
  - On any guide you can see, click “Fork this guide”.
  - The app:
    - Creates a new guide in your PDS that points back to the original via `forkedFrom`.
    - Copies each item into your own PDS.
  - You can then edit, add, or remove items independently.

- **CPM badge**
  - The app reads a config list of CPM staff DIDs.
  - If a guide’s author DID is in that list, the UI shows a clear “CPM / Chicago Public Media” badge next to the author.

The goal of Phase 2 is to have **guides fully working** end‑to‑end, even before external data sources and feeds come online.

---

## 4. Phase 3 – Data Sources and Agate (Geo & Neighborhoods)

Phase 3 introduces **structured data sources**, especially:

- **Agate**, which knows:
  - Places
  - Neighborhoods / community areas in Chicago
  - Their relationships and metadata

We want:

- A consistent way to plug **Agate** and other APIs into guides.
- Guides that understand “this item is in this community area.”
- The ability to refresh items as source data changes.

### 4.1 Data‑source registry (concept)

We’ll design a small **data‑source registry** inside the app. For each source, it describes:

- **id**: e.g. `"agate"`, `"cpm-events"`, `"cms-articles"`.
- **type**: `"place"`, `"event"`, `"article"`, etc.
- **base URL**: where to call the source’s API (or a proxy).
- **auth**: API keys or tokens if required.
- **capabilities**:
  - `supportsGeo`: has latitude/longitude.
  - `supportsNeighborhoods`: can tell us which community area a place belongs to.

This registry can be driven by env variables or a small JSON config that engineers can extend.

### 4.2 How Agate is used

For **Agate**:

- **Configuration**
  - Environment variables like `AGATE_API_URL`, `AGATE_API_KEY`.
  - The registry entry says:
    - “This is a place/neighborhood source.”
    - “It supports geo and neighborhoods.”

- **Guide items referencing Agate**
  - When an item comes from Agate, the record stores:
    - `sourceId` = Agate’s place or neighborhood ID.
    - `sourceLabel` = `"Agate"`.
    - `sourceUrl` = optional URL if Agate exposes one.

- **Snapshots from Agate**
  - Adding from Agate:
    - The app calls Agate’s API to fetch:
      - Name
      - Description
      - Latitude, longitude
      - Neighborhood / community area identifier
    - The app stores:
      - That data in the `guideItem` snapshot.
      - The geo and neighborhood info in the DB (so we can query by area).

- **User interface**
  - Instead of typing everything by hand, the user can:
    - Click “Add from Agate”.
    - Search or browse for a place or neighborhood.
    - Select it; the app fills in the title, description, and metadata automatically.

### 4.3 Refreshing data

For items tied to a data source:

- We can offer a **“Refresh from source”** action:
  - The app re‑calls the configured source using `sourceId`.
  - It updates the record in the PDS and the snapshot in the DB.
- We can also build background refresh jobs for critical sources.

Phase 3 is where guides become **geo‑aware** and “know where they are” in Chicago.

---

## 5. Phase 4 – Feeds and Discovery (Community Areas & Citywide)

With guides and Agate data in place, we can build **feeds** that answer:

- “What’s happening in this particular community area?”
- “What’s new across the whole city?”
- “How are CPM guides being remixed by the community?”

### 5.1 What we mean by “feed”

A **feed** is a dynamic list of content, ordered and filtered in useful ways.

Examples we want:

- **Per community area feed**
  - For each Chicago community area, show guides that contain items in that area.
- **Citywide feed**
  - Show newly created or updated guides across all areas.
  - Potentially highlight CPM‑authored guides first.

These feeds are built by querying the **local DB index**, which knows:

- Which guides exist.
- Which items they contain.
- Which community areas those items come from (via Agate metadata).

### 5.2 Community‑area feeds

Once guide items carry a `neighborhoodId` or similar:

- For each community area:
  - We can find all guide items that reference that area.
  - Then find the guides those items belong to.
- We can build per‑area feeds like:
  - “Guides for Rogers Park”
  - “Guides for Englewood”, etc.

In the app:

- A route like `/community/[communityAreaSlug]` can:
  - Look up the area by slug.
  - Query the DB for relevant guides.
  - Display them with context (author, CPM badge, number of items).

### 5.3 Citywide feed

A **citywide feed** can:

- Combine feeds from all community areas.
- Or just list guides ordered by recency, remix activity, or editorial picks.
- Optionally:
  - Surface CPM guides more prominently.
  - Show how often CPM guides are being forked or remixed.

### 5.4 Custom feeds (ATProto custom feeds)

ATProto also supports **custom feed services**:

- A separate service (or a set of endpoints) that:
  - Subscribes to the firehose.
  - Maintains its own view of the data.
  - Exposes feeds that ATProto clients can subscribe to.

For Lock & Archer:

- We can:
  - Implement an example feed service that reads from:
    - The same PDS data.
    - Or the app’s DB index.
  - Define built‑in feeds like:
    - “Guides by community area”.
    - “Citywide guides”.

- Technical users can:
  - Fork this service.
  - Add their own feed definitions in code (e.g. “guides containing Agate places with category X”).
  - Deploy them so:
    - They show up in Lock & Archer’s UI, and/or
    - They’re discoverable as ATProto custom feeds in other clients.

This gives:

- **Non‑technical users:** default curated feeds in the app.
- **Technical users:** a path to **write and deploy their own feed logic**.

---

## 6. Phase 5 – Making Feeds Pluggable

Phase 5 goes further and makes feeds a **first‑class, pluggable concept**:

- A small, documented **feed definition pattern**:
  - Even if it starts as “write a TypeScript function with this signature.”
- A `feeds/` directory or repo that contains:
  - Community‑area feed.
  - Citywide feed.
  - CPM‑only feed.
  - Experimental community feeds contributed by technical users.
- A way for:
  - The main app to discover which feeds exist and show them as options.
  - Technical users to add or modify feeds with minimal friction.

This keeps a clean separation between:

- **Core product features** (guides, Agate, core feeds).
- **Experimental / custom logic** (user‑authored feeds).

---

## 7. Summary by Audience

### 7.1 Non‑technical

- **Phase 2:**  
  Guides are live. People can create and remix guides of articles/events/places. Guides live with the author but can be discovered and forked across the network.

- **Phase 3:**  
  Guides become smarter by integrating with Agate and other data sources. Items know which neighborhoods and community areas they belong to.

- **Phase 4:**  
  We build feeds:
  - Per community area.
  - Citywide.
  So local residents and staff can quickly see what’s relevant where.

- **Phase 5:**  
  Technical contributors can write and deploy their own feeds, creating new ways of seeing and organizing the same shared data.

### 7.2 Technical

- New lexicons: `com.cpm.guides.guide`, `com.cpm.guides.guideItem` in user PDSes.
- Local DB: `guide` and `guide_item` tables, mirroring PDS via Tap + webhook, with write‑through on writes.
- Data‑source registry: pluggable sources (Agate, CPM events, CMS), each with an adapter that resolves `sourceId` → snapshot (including geo/neighborhood when available).
- Feeds:
  - In‑app feeds driven by DB queries.
  - Optional ATProto custom feed services for external consumption and user‑authored feed logic.

---

## Technical Appendix

### A. ATProto Components We Use

- **PDS**:
  - Holds user accounts and records.
  - Must be configured to accept our custom guide lexicons.

- **Lexicons**:
  - `xyz.statusphere.status` (already in place for statuses).
  - Planned:
    - `com.cpm.guides.guide`
    - `com.cpm.guides.guideItem`
  - Generated TypeScript bindings live under `src/lexicons/…`.

- **Tap**:
  - Subscribes to:
    - Identity events.
    - `xyz.statusphere.status`.
    - Later: `com.cpm.guides.guide`, `com.cpm.guides.guideItem`.
  - Forwards those events to our `/api/webhook`.

- **App DB (SQLite + Kysely)**:
  - Existing tables:
    - `auth_state`, `auth_session` (OAuth helpers).
    - `account` (DID + handle).
    - `status` (Statusphere statuses).
  - Planned tables:
    - `guide`
    - `guide_item`

### B. Proposed Guide Table Shapes (Conceptual)

_Not strict TypeScript, just shapes for intuition._

- **Guide**

  - `uri`: string (AT URI, primary key)
  - `authorDid`: string
  - `title`: string
  - `description`: string | null
  - `slug`: string | null
  - `forkedFrom`: string | null (AT URI)
  - `createdAt`: string (ISO timestamp)
  - `updatedAt`: string (ISO timestamp)
  - `indexedAt`: string (ISO timestamp; when Tap saw it)

- **GuideItem**

  - `uri`: string (AT URI, primary key)
  - `guideUri`: string
  - `authorDid`: string
  - `type`: `"article" | "event" | "business" | "place" | string`
  - `sourceId`: string | null
  - `sourceUrl`: string | null
  - `sourceLabel`: string | null  (e.g. `"Agate"`)
  - `title`: string
  - `description`: string | null
  - `snapshotAt`: string | null    (when snapshot was last fetched)
  - `indexedAt`: string            (when Tap saw it)
  - `latitude`: number | null      (Phase 3+)
  - `longitude`: number | null     (Phase 3+)
  - `neighborhoodId`: string | null (Phase 3+)

### C. Write Path vs. Read Path

- **Write path (create/edit)**:
  1. API validates input and checks session.
  2. Uses the OAuth client to:
     - `create` or `put` a lexicon record into the user’s PDS.
  3. Performs a **write‑through** to the DB:
     - Insert/upsert into `guide` / `guide_item`.
  4. Returns JSON to the client.

- **Read path (UI & feeds)**:
  - Primarily uses the **DB**:
    - Lists guides.
    - Joins guides with items.
    - Filters by author, time, or later `neighborhoodId`.
  - In rare cases, may fall back to PDS reads (e.g. if DB is behind, or for debugging).

### D. Data‑Source Adapters (Phase 3)

For each data source (Agate, events, CMS):

- Implement an adapter such as:

  - `resolveById(sourceId) → { title, description, geo/neighborhood metadata… }`

- For Agate:
  - `resolvePlaceOrArea(sourceId)`:
    - Calls Agate API.
    - Maps Agate’s response into our snapshot shape:
      - `title` = place or area name.
      - `description` = summary from Agate.
      - `latitude`, `longitude`.
      - `neighborhoodId` (Agate community‑area ID or equivalent).

Adapters are called by:

- “Add from source” UI flows.
- “Refresh from source” actions.
- Potentially by background jobs.

### E. Feeds Implementation Notes

- **In‑app feeds**:
  - Implement as API endpoints like:
    - `GET /api/feeds/citywide`
    - `GET /api/feeds/community/[communityAreaId]`
  - These endpoints:
    - Query `guide` and `guide_item` tables.
    - Aggregate and sort results (e.g. by `indexedAt` or `updatedAt`).

- **Custom feed services (ATProto)**:
  - A separate service can:
    - Subscribe to Tap.
    - Maintain its own index.
    - Expose feed endpoints that conform to ATProto feed specs.
  - That service can be:
    - Driven by the same guide and Agate logic.
    - Open to contributions from technical users who define new feed functions.

---

## How to Use This Document

- Save this file in the `lock-and-archer` repo under `docs/`, for example:
  - `docs/phase-2-5-guides-data-sources-feeds.md`
- Share the GitHub link with colleagues for review and discussion.
