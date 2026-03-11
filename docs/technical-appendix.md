# Technical appendix

Reference for engineers: ATProto components we use, DB shapes, write/read paths, and later-phase notes.

---

## A. ATProto components

- **PDS** – User accounts and records. Must accept our custom guide lexicons; see [phase-2-implementation.md](phase-2-implementation.md) for confirming PDS config.
- **Lexicons** – `xyz.statusphere.status` (existing); `com.cpm.guides.guide`, `com.cpm.guides.guideItem` (Phase 2). TypeScript under `src/lexicons/…`. Phase 2 UI shows property badges (Chicago Sun-Times, WBEZ, chicago.com) per staff DID config.
- **Tap** – Subscribes to identity, status, and (after Phase 2) guide/guideItem; forwards to `/api/webhook`.
- **App DB (SQLite + Kysely)** – Existing: `auth_state`, `auth_session`, `account`, `status`. Phase 2: `guide`, `guide_item`.

---

## B. Guide table shapes (conceptual)

**Guide**

- uri (PK), authorDid, title, description, slug, forkedFrom, createdAt, updatedAt, indexedAt.

**GuideItem**

- uri (PK), guideUri, authorDid, type, sourceId, sourceUrl, sourceLabel, title, description, snapshotAt, indexedAt.
- Phase 3+: latitude, longitude, neighborhoodId (nullable).

All timestamp columns stored as strings (ISO) in SQLite.

---

## C. Write path vs read path

- **Write** – API validates input and session → OAuth client create/put/delete to PDS → write-through to DB (insert/update/delete guide or guide_item) → return JSON.
- **Read** – Primarily from DB: list guides, get guide by URI/slug, list items by guideUri. Fall back to PDS only when needed (e.g. DB missing a record).

---

## D. Data-source adapters (Phase 3)

Each source implements something like:

- `resolveById(sourceId) → { title, description, geo?, neighborhoodId? }`

For Agate: `resolvePlaceOrArea(sourceId)` calls Agate API and maps to our snapshot shape. Used by “Add from source” and “Refresh from source.”

---

## E. Feeds (Phase 4)

- **In-app** – Endpoints such as `GET /api/feeds/citywide`, `GET /api/feeds/community/[communityAreaId]` query `guide` and `guide_item`, filter by neighborhoodId when needed, aggregate and sort.
- **Custom feed service** – Separate service subscribes to Tap, maintains its own index, exposes ATProto feed endpoints; can be extended by technical users.

---

## F. Phase 6 – Community-area onboarding (later)

- **Storage** – Extend `account` or add `user_preferences` (e.g. did, communityAreaId, updatedAt). Key by DID.
- **Boundaries** – [City of Chicago – Boundaries: Community Areas](https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Community-Areas-Map/cauq-8yn6). Point-in-polygon (lat, lon) → community area ID/name. Align with Agate’s neighborhoodId.
- **Geocoding** – Address → coordinates, then boundary lookup. Optional step; store only community area for privacy.

---

## Design standards

UI must follow [design-standards.md](design-standards.md): tokens, no hardcoded hex, typography, mobile-first, accessibility.
