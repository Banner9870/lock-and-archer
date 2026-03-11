# Phase 3 – Data sources and Agate (geo & neighborhoods)

Phase 3 adds **structured data sources** so guides can pull in places and neighborhoods from external systems. The main sources we use are **Agate** (Chicago places) and **Chicago Socrata** (e.g. Chicago Public Library events).

---

## Goals

- A consistent way to plug **Agate** (and later other APIs) into guides.
- Guide items that “know where they are”: optional `latitude`, `longitude`, `neighborhoodId` (community area).
- Ability to **refresh** items when the source data changes (documented; refresh flow not fully implemented).

---

## Data-source registry

We have a small **registry** of data sources (e.g. from env). For each source:

- **id** – e.g. `agate`, `chicago-events`
- **type** – e.g. `place`, `event`
- **base URL** – API or proxy endpoint
- **capabilities** – e.g. `supportsGeo`, `supportsNeighborhoods`

Adapters live in `lib/data-sources/`.

---

## Agate integration (implemented)

- **Config** – `AGATE_API_URL` (optional). When not set, the Agate adapter returns stub/mock behavior so the app runs without Agate.
- **Guide items from Agate** – Store `sourceId`, `sourceLabel: "Agate"`, optional `sourceUrl`; snapshot has title, description, latitude, longitude, neighborhoodId.
- **UI** – “Add from Agate” on guide detail (owner only): search or resolve by ID, add place or neighborhood to the guide. Creates guideItem on PDS + write-through.
- **API** – `GET /api/data-sources/agate/resolve?sourceId=`, `GET /api/data-sources/agate/search?q=`.

Refresh from source (re-fetch snapshot and update record) is planned; not fully wired in UI.

---

## Chicago Socrata / CPL events (implemented)

The [Chicago Public Library events](https://data.cityofchicago.org/resource/vsdy-d8k7) dataset is ingested via the [SODA API](https://dev.socrata.com/foundry/data.cityofchicago.org/vsdy-d8k7). **Adapter:** `lib/data-sources/chicago-socrata.ts`. **Env:** optional `SOCRATA_APP_TOKEN`. **APIs:** `GET /api/data-sources/chicago-events/resolve?sourceId=`, `GET /api/data-sources/chicago-events/search?q=`. **UI:** “Add from Chicago Public Library” on guide detail (owner only). CPL events use community area number as `neighborhoodId`; map to names in `lib/community-areas.ts` for name-based community feeds.

---

## Geo and map (implemented)

- **DB** – Guide item table has `latitude`, `longitude`, `neighborhoodId` (nullable). Migration 004.
- **Map** – OpenStreetMap at `/guides/map` (react-leaflet, OSM tiles). API `GET /api/guides/items-with-geo`. Per-guide map on guide detail (`GuideMapSection`) when items have geo.
- **Feeds** – Community-area feeds filter by `neighborhoodId`; see [phase-4-5-feeds.md](phase-4-5-feeds.md).

---

## Implementation notes

- **Adapters** – Each source implements something like `resolveById(sourceId)` and optionally `search(q)`. Agate and Chicago Socrata adapters map responses to our snapshot shape (title, description, geo, neighborhoodId).
- See [technical-appendix.md](technical-appendix.md) for adapter and data-source details.
