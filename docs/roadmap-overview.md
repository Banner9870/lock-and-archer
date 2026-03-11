# Roadmap overview (Phases 2–6)

Lock & Archer is an ATProto app for **community guides** and **local storytelling**. This doc summarizes the roadmap and what exists today; see the linked docs for each phase.

---

## Executive summary

| Phase | Focus |
|-------|--------|
| **Phase 2 – Guides** | Guides and guide items in each author’s PDS; mirror in app DB. Create, list, view guides; add items (from Agate or Chicago Public Library). Home shows **recent guides**. |
| **Phase 3 – Data sources & Agate** | Data-source registry; Agate (Chicago places) and Chicago Socrata (CPL events) adapters. “Add from Agate” / “Add from Chicago Public Library” on guide detail. Geo and map. |
| **Phase 4 – Feeds** | Citywide and community-area feeds; **Following** feed (guides from people you follow). Unified feed of guides + articles (e.g. Sun-Times RSS). |
| **Phase 5 – Custom feeds** | Pluggable feed pattern so technical users can add their own feeds (future). |
| **Phase 6 – Community-area onboarding (later)** | After sign-up, user sets community area; app recommends that area’s feed (future). |

---

## ATProto in plain language

- **Handle** – Human-readable name (e.g. `alice.lock-and-archer-pds.up.railway.app`). **DID** – Stable id (e.g. `did:plc:…`). Handle points to DID; DID points to where data lives.
- **PDS** – Where your content lives (guides, items, profile). We use a test PDS (e.g. lock-and-archer-pds) for accounts and guide data.
- **App** – Client: sign-in, read/write records via PDS. It does not own the data.
- **Lexicons** – Schemas for record types. We use `com.cpm.guides.guide` and `com.cpm.guides.guideItem`.
- **OAuth** – Users sign in; app writes to their PDS on their behalf.

---

## What exists today

- **OAuth login** – Handle → DID → OAuth flow.
- **Create account** – When `PDS_APP_URL` is set, users can create an account on our PDS from the app.
- **Guides** – Create guide, list recent/my guides, view detail. Add items via “Add from Agate” or “Add from Chicago Public Library” (owner only). Guide map at `/guides/map`; per-guide map on detail. Write-through to app DB; webhook indexes guide/guideItem.
- **Geo** – Guide items have optional `latitude`, `longitude`, `neighborhoodId`. Seed data and data sources include Chicago-area coordinates and community areas.
- **Feeds** – **Citywide:** `GET /api/feeds/citywide`; pages `/feeds`, `/feeds/citywide`. **Community area:** `GET /api/feeds/community/[communityId]`; page `/feeds/community/[id]`. **Following:** `GET /api/feeds/following` and `/feeds/following` (guides from people you follow; sign-in required). Unified feed merges guides and feed articles (e.g. Sun-Times RSS) by date.
- **RSS ingest** – Chicago Sun-Times articles via `GET` or `POST /api/ingest/suntimes-rss`; stored in `feed_article`; appear in citywide and community feeds.
- **Blob proxy** – `GET /api/blob?did=...&cid=...` for safe avatar/media URLs; `blobProxyUrl(did, cid)` in `lib/blob-url.ts`; DID → PDS resolution in `lib/did-resolve.ts`.
- **Deploy-time seed** – `pnpm railway-seed` reseeds three PDS accounts (alice, bob, carol) with profiles, fallback avatars, mutual follows, and guides; inserts guides into app DB. Optional on Railway deploy.
- **Statusphere** – Status posting and Recent/Top statuses gated by `ENABLE_STATUSPHERE` (default off).

---

## Not yet implemented

- **Fork guide** – Copy a guide (and items) into your repo with `forkedFrom` set; no API or UI yet.
- **PATCH/DELETE guide** – Edit or delete guide; no API or UI yet.
- **DELETE guide item** – No API or UI yet.
- **Property badges in UI** – `getStaffProperties(did)` exists; list/detail do not yet show Chicago Sun-Times / WBEZ / chicago.com badges.
- **Phase 5 – Pluggable feeds** – Documented; not implemented.
- **Phase 6 – Community-area onboarding** – Documented; not implemented.
- **Avatar hydration** – Blob proxy exists; we do not yet fetch profile/avatar from PDS for feed cards or nav.

---

## Where to read next

| Doc | Purpose |
|-----|---------|
| [phase-1-guide-data-model.md](phase-1-guide-data-model.md) | Data model, NSIDs, fork semantics |
| [phase-2-guides.md](phase-2-guides.md) | What a guide is, UX, property badges |
| [phase-2-implementation.md](phase-2-implementation.md) | API routes, implementation checklist, testing |
| [phase-3-agate.md](phase-3-agate.md) | Data sources, Agate, CPL, geo/map |
| [phase-4-5-feeds.md](phase-4-5-feeds.md) | Feeds (citywide, community, Following), ingest |
| [phase-6-community-onboarding.md](phase-6-community-onboarding.md) | Address → community area (later) |
| [technical-appendix.md](technical-appendix.md) | DB shapes, write/read path |
| [design-standards.md](design-standards.md) | Tokens, typography, components |
| [design-evaluation-and-ui-plan.md](design-evaluation-and-ui-plan.md) | UI vs standards, blob/avatar plan |
| [social-graph-and-cdn-plan.md](social-graph-and-cdn-plan.md) | Follows, Following feed, blob proxy |
| [ACCOUNT_CREATION_PLAN.md](ACCOUNT_CREATION_PLAN.md) | Create-account flow (implemented) |
| [PHASE-1-2-REVIEW.md](PHASE-1-2-REVIEW.md) | Phase 1/2 implementation status |
