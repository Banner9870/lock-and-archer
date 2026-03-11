# Phase 4 – Feeds and discovery | Phase 5 – Pluggable feeds

---

## Phase 4 – Feeds (implemented)

Feeds answer “what’s relevant where” and “what’s from people I follow.”

### Implemented

- **Citywide** – `GET /api/feeds/citywide`; page `/feeds/citywide`. Unified feed of guides and articles (e.g. Chicago Sun-Times RSS), newest first.
- **Community area** – `GET /api/feeds/community/[communityId]`; page `/feeds/community/[id]`. Guides (and tagged articles) for that neighborhood; same unified shape as citywide.
- **Following** – `GET /api/feeds/following` (auth required); page `/feeds/following`. Guides from accounts the signed-in user follows. Uses PDS `app.bsky.graph.getFollows` and app DB `listGuidesByAuthorDids`.
- **Feeds landing** – `/feeds` with links to Citywide, Following, and community areas (from `COMMUNITY_AREAS`).
- **Chicago Sun-Times RSS** – Articles from [chicago.suntimes.com/rss](https://chicago.suntimes.com/rss/index.xml) ingested via `GET` or `POST /api/ingest/suntimes-rss`; stored in `feed_article`; merged into citywide and community feeds.

Implementation: `lib/feeds/unified.ts` (`getUnifiedFeedItems`, `getFollowingFeedItems`, `getFollowedDids`, `getFollowingFeedForUser`); `lib/db/queries.ts` (`listGuidesByAuthorDids`). See [technical-appendix.md](technical-appendix.md).

---

## Phase 5 – Pluggable feeds (future)

Phase 5 would make feeds **pluggable**:

- Documented feed definition pattern (e.g. function signature).
- A `feeds/` directory or repo with community-area, citywide, staff-only, and community-contributed feeds.
- App discovers which feeds exist and surfaces them.

Not yet implemented.
