# Phase 3 – Data sources and Agate (geo & neighborhoods)

Phase 3 adds **structured data sources** so guides can pull in places and neighborhoods from external systems. The main source we care about first is **Agate**, which knows Chicago places and community areas.

---

## Goals

- A consistent way to plug **Agate** (and later other APIs) into guides.
- Guide items that “know where they are”: which neighborhood or community area they belong to.
- Ability to **refresh** items when the source data changes.

---

## Data-source registry

We’ll add a small **registry** of data sources (from env or a config file). For each source:

- **id** – e.g. `agate`, `cpm-events`, `cms-articles`
- **type** – e.g. `place`, `event`, `article`
- **base URL** – API or proxy endpoint
- **auth** – API keys or tokens if required
- **capabilities** – e.g. `supportsGeo`, `supportsNeighborhoods`

---

## Agate integration

- **Config** – e.g. `AGATE_API_URL`, `AGATE_API_KEY` (optional). Registry entry marks it as a place/neighborhood source with geo support.
- **Guide items from Agate** – Store `sourceId` (Agate place or neighborhood ID), `sourceLabel: "Agate"`, and optional `sourceUrl`. When adding from Agate, the app calls the API and gets name, description, latitude, longitude, neighborhoodId; these go into the snapshot and into the app DB.
- **UI** – “Add from Agate” lets users search or browse places/neighborhoods and add one to a guide; the app fills in title, description, and geo metadata.
- **Refresh** – “Refresh from source” re-fetches the snapshot from the configured source and updates the record and DB.

Phase 3 is where guides become **geo-aware** and we can later power feeds by community area (Phase 4).

---

## Implementation notes

- **Adapters** – Each source has an adapter (e.g. `resolveById(sourceId) → { title, description, geo, neighborhoodId }`). Agate adapter: call Agate API, map response to our snapshot shape.
- **DB** – Guide item table already has (or we add) `latitude`, `longitude`, `neighborhoodId` so we can query by area without a later migration.
- See [technical-appendix.md](technical-appendix.md) for adapter and data-source details.
