# Phase 4 – Feeds and discovery | Phase 5 – Pluggable feeds

---

## Phase 4 – Feeds (community areas and citywide)

Once guides and Agate (Phase 3) are in place, we build **feeds** that answer “what’s relevant where.”

- **Per community area** – For each Chicago community area, show guides that contain items in that area (using `neighborhoodId` on items). Route e.g. `/community/[communityAreaSlug]`.
- **Citywide** – New or updated guides across all areas; optionally highlight staff guides (Chicago Sun-Times, WBEZ, chicago.com) and remix activity.
- **Custom feeds (ATProto)** – A feed service can subscribe to the firehose, maintain a view, and expose feeds that other ATProto clients can subscribe to. Technical users can fork this service and add their own logic (e.g. “guides containing Agate places with category X”).

**Implementation** – In-app feeds are API endpoints (e.g. `GET /api/feeds/citywide`, `GET /api/feeds/community/[communityAreaId]`) that query the `guide` and `guide_item` tables, filter by neighborhoodId when needed, and sort by recency or other signals. See [technical-appendix.md](technical-appendix.md).

---

## Phase 5 – Making feeds pluggable

Phase 5 makes feeds **first-class and pluggable**:

- Documented **feed definition pattern** (e.g. “write a function with this signature”).
- A `feeds/` directory or repo with community-area feed, citywide feed, staff-only feed (Sun-Times / WBEZ / chicago.com), and room for community-contributed feeds.
- The main app discovers which feeds exist and surfaces them; technical users can add or modify feeds with minimal friction.

This keeps a clear split between core product feeds and experimental or user-authored feed logic.
